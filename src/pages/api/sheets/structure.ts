import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

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
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at, google_sheet_id')
      .eq('id', user.id)
      .single();

    if (!profile?.google_access_token) return res.status(403).json({ error: 'Google account not connected' });
    if (!profile.google_sheet_id) return res.status(400).json({ error: 'No Google Sheet URL configured' });

    let accessToken = profile.google_access_token as string;
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at as string) : null;
    if ((!expiresAt || expiresAt.getTime() < Date.now() + 60_000) && profile.google_refresh_token) {
      const newToken = await refreshAccessToken(profile.google_refresh_token as string);
      if (newToken) {
        accessToken = newToken;
        await supabase.from('profiles').update({ google_access_token: newToken }).eq('id', user.id);
      }
    }

    const sheetId = extractSheetId(profile.google_sheet_id as string);

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metaRes.ok) {
      const errBody = await metaRes.json().catch(() => ({}));
      const msg = (errBody as { error?: { message?: string } })?.error?.message ?? `Error ${metaRes.status}`;
      return res.status(400).json({ error: `No se pudo acceder a la planilla: ${msg}. Revisá que la URL sea correcta y que Ritto tenga permisos.` });
    }
    const meta = await metaRes.json();
    const tabs: string[] = (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);

    let sampleHeaders: string[] = [];
    let sampleTab = '';

    for (const tab of tabs.slice(0, 10)) {
      const enc = encodeURIComponent(tab);
      const rowRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}!A1:ZZ1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!rowRes.ok) continue;
      const rowData = await rowRes.json();
      const headers: string[] = (rowData.values?.[0] ?? []).filter((h: unknown) => typeof h === 'string' && h.trim());
      if (headers.length > 0) {
        sampleHeaders = headers;
        sampleTab = tab;
        break;
      }
    }

    return res.status(200).json({ tabs, sampleHeaders, sampleTab });
  } catch (err) {
    console.error('[structure] unhandled error:', err);
    return res.status(500).json({ error: 'Error interno. Intentá de nuevo o escribinos a soporte@ritto.lat' });
  }
}
