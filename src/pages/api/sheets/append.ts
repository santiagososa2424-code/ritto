import type { NextApiRequest, NextApiResponse } from 'next';
import type { ExcelColumn } from '../../../lib/types';
import { DEFAULT_COLUMNS } from '../../../lib/types';
import { createClient } from '@supabase/supabase-js';

function extractSheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

async function refreshAccessToken(rt: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: rt,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoices, userId, mapping } = req.body as {
    invoices: Record<string, unknown>[];
    userId: string;
    mapping?: ExcelColumn[];
  };

  if (!invoices?.length || !userId) {
    return res.status(400).json({ error: 'invoices and userId are required' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at, google_sheet_id')
    .eq('id', userId)
    .single();

  if (!profile?.google_access_token) {
    return res.status(403).json({ error: 'Google account not connected' });
  }
  if (!profile.google_sheet_id) {
    return res.status(400).json({ error: 'No Google Sheet URL configured' });
  }

  let accessToken = profile.google_access_token as string;
  const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at as string) : null;
  if ((!expiresAt || expiresAt.getTime() < Date.now() + 60_000) && profile.google_refresh_token) {
    const newToken = await refreshAccessToken(profile.google_refresh_token as string);
    if (newToken) {
      accessToken = newToken;
      await supabase.from('profiles').update({ google_access_token: newToken }).eq('id', userId);
    }
  }

  const sheetId = extractSheetId(profile.google_sheet_id as string);
  const columns: ExcelColumn[] = mapping?.length ? mapping : DEFAULT_COLUMNS;
  const header = columns.map((c) => c.label);
  const rows = invoices.map((inv) =>
    columns.map((col) => {
      const v = inv[col.field];
      return v == null ? '' : typeof v === 'number' ? v : String(v);
    })
  );

  // Check if sheet already has data to avoid duplicating the header row
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:Z1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const checkData = await checkRes.json();
  const sheetHasData = checkData.values && checkData.values.length > 0;
  const valuesToAppend = sheetHasData ? rows : [header, ...rows];

  const sheetsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: valuesToAppend }),
    }
  );

  if (!sheetsRes.ok) {
    const err = await sheetsRes.json();
    return res.status(500).json({ error: 'Google Sheets error', details: err });
  }

  const result = await sheetsRes.json();
  return res.status(200).json({ ok: true, rowsAdded: rows.length, updatedRange: result.updates?.updatedRange });
}
