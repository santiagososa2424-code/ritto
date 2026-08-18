import type { NextApiRequest, NextApiResponse } from 'next';
import type { ExcelColumn } from '../../../lib/types';
import { DEFAULT_COLUMNS } from '../../../lib/types';

// TODO: implement Google OAuth token refresh and Sheets API call
// Required env vars (set in Vercel once Google Cloud project is ready):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI  (e.g. https://ritto.lat/api/auth/google/callback)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoices, sheetId, mapping } = req.body as {
    invoices: Record<string, unknown>[];
    sheetId: string;
    mapping?: ExcelColumn[];
  };

  if (!invoices?.length || !sheetId) {
    return res.status(400).json({ error: 'invoices and sheetId are required' });
  }

  const columns: ExcelColumn[] = mapping?.length ? mapping : DEFAULT_COLUMNS;

  const header = columns.map((c) => c.label);
  const rows = invoices.map((inv) =>
    columns.map((col) => {
      const v = inv[col.field];
      return v == null ? '' : typeof v === 'number' ? v : String(v);
    })
  );

  // TODO: use google_access_token from user profile to call:
  // POST https://sheets.googleapis.com/v4/spreadsheets/{sheetId}/values/A1:append
  // with { values: [header, ...rows], valueInputOption: 'USER_ENTERED' }

  return res.status(501).json({
    message: 'Google Sheets integration coming soon — rows ready to append',
    preview: { header, rowCount: rows.length },
  });
}
