import type { NextApiRequest, NextApiResponse } from 'next';
import type { ExcelColumn } from '../../../lib/types';
import { DEFAULT_COLUMNS } from '../../../lib/types';
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

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(s\.?a\.?s?\.?|s\.?r\.?l\.?|s\.?a\.?|ltda\.?|inc\.?|corp\.?|co\.?)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const COLUMN_ALIASES: Record<string, string[]> = {
  proveedor: ['empresa', 'supplier', 'vendedor', 'emisor', 'razon social', 'comercio', 'nombre', 'compania', 'distribuidor', 'proveedor'],
  rut: ['rut emisor', 'cuit', 'nit', 'id fiscal', 'identificacion fiscal', 'documento', 'ruc', 'rut proveedor'],
  fecha: ['fecha factura', 'fecha emision', 'fecha de emision', 'date', 'fecha comprobante', 'fecha doc', 'fecha documento'],
  'nro documento': ['numero', 'n', 'factura n', 'numero factura', 'nro factura', 'nro doc', 'comprobante', 'numero comprobante', 'nro comprobante'],
  tipo: ['tipo documento', 'tipo comprobante', 'tipo doc', 'tipo de documento'],
  moneda: ['currency', 'divisa', 'tipo moneda', 'tipo de moneda'],
  neto: ['subtotal', 'base imponible', 'monto neto', 'neto gravado', 'base', 'importe neto'],
  'iva total': ['iva', 'impuesto', 'impuestos', 'tax', 'total iva', 'imp'],
  total: ['monto', 'importe', 'monto total', 'valor total', 'precio total', 'total factura', 'total comprobante', 'amount', 'total a pagar'],
};

function resolveColumnAlias(normalizedHeader: string): string {
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (normalizedHeader === canonical || aliases.some((a) => normalizedHeader === a || normalizedHeader.includes(a) || a.includes(normalizedHeader))) {
      return canonical;
    }
  }
  return normalizedHeader;
}

function findMatchingTab(provider: string, tabs: string[]): string | null {
  const np = normalize(provider);
  if (!np) return null;
  for (const tab of tabs) {
    if (normalize(tab) === np) return tab;
  }
  for (const tab of tabs) {
    const nt = normalize(tab);
    if (nt && (np.includes(nt) || nt.includes(np))) return tab;
  }
  return null;
}

async function ensureTab(sheetId: string, tabName: string, accessToken: string, existing: string[]): Promise<void> {
  if (existing.includes(tabName)) return;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
  });
}

async function appendToTab(
  sheetId: string,
  tabName: string,
  rows: (string | number)[][],
  header: string[],
  accessToken: string,
): Promise<{ ok: boolean; updatedRange?: string }> {
  const enc = encodeURIComponent(tabName);
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}!A1:ZZ1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const checkData = await checkRes.json();
  const existingHeaders: string[] = checkData.values?.[0] ?? [];

  let values: (string | number)[][];
  if (existingHeaders.length > 0) {
    const normalizedExisting = existingHeaders.map((h) => resolveColumnAlias(normalize(String(h))));
    const normalizedOurs = header.map((h) => resolveColumnAlias(normalize(String(h))));
    const matchCount = normalizedOurs.filter((h) => normalizedExisting.includes(h)).length;
    if (matchCount > 0) {
      const remappedRows = rows.map((row) =>
        existingHeaders.map((_, colIdx) => {
          const ourIdx = normalizedOurs.findIndex((h) => h === normalizedExisting[colIdx]);
          return ourIdx >= 0 ? row[ourIdx] : '';
        }),
      );
      values = remappedRows;
    } else {
      values = [header, ...rows];
    }
  } else {
    values = [header, ...rows];
  }

  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    },
  );
  if (!r.ok) return { ok: false };
  const result = await r.json();
  return { ok: true, updatedRange: result.updates?.updatedRange };
}

const FALLBACK_TAB = 'Ritto - Sin clasificar';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { invoices, mapping } = req.body as {
    invoices: Record<string, unknown>[];
    mapping?: ExcelColumn[];
  };

  if (!invoices?.length) return res.status(400).json({ error: 'invoices es requerido' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at, google_sheet_id, sheet_column_mapping')
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
  let columns: ExcelColumn[] = mapping?.length ? mapping : DEFAULT_COLUMNS;

  // If the user has a saved column mapping (rittoField → sheetColumnHeader),
  // rename our column labels so they match the sheet's actual headers exactly.
  const savedMapping = profile.sheet_column_mapping as Record<string, string> | null | undefined;
  if (savedMapping && Object.keys(savedMapping).length > 0) {
    columns = columns.map((col) => ({
      ...col,
      label: savedMapping[col.field] ?? col.label,
    }));
  }

  const header = columns.map((c) => c.label);

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) return res.status(500).json({ error: 'No se pudieron obtener las pestañas de la planilla' });
  const meta = await metaRes.json();
  const existingTabs: string[] = (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);

  const groups: Record<string, Record<string, unknown>[]> = {};
  for (const inv of invoices) {
    const provider = typeof inv.proveedor === 'string' ? inv.proveedor : '';
    const tab = (provider && findMatchingTab(provider, existingTabs)) || FALLBACK_TAB;
    if (!groups[tab]) groups[tab] = [];
    groups[tab].push(inv);
  }

  let totalRows = 0;
  const writtenTabs: string[] = [];

  const NUMERIC_SIGN_FIELDS = new Set(['neto', 'iva10', 'iva22', 'ivaTotal', 'total']);

  for (const [tabName, tabInvoices] of Object.entries(groups)) {
    const rows = tabInvoices.map((inv) => {
      const isNC = typeof inv.tipoDocumento === 'string' && /cr[eé]dito/i.test(inv.tipoDocumento);
      return columns.map((col) => {
        const v = inv[col.field];
        if (v == null) return '';
        if (typeof v === 'number' && isNC && NUMERIC_SIGN_FIELDS.has(col.field)) return -v;
        return typeof v === 'number' ? v : String(v);
      });
    });
    await ensureTab(sheetId, tabName, accessToken, existingTabs);
    const result = await appendToTab(sheetId, tabName, rows, header, accessToken);
    if (result.ok) {
      totalRows += rows.length;
      writtenTabs.push(tabName);
    }
  }

  return res.status(200).json({
    ok: true,
    rowsAdded: totalRows,
    tabs: writtenTabs,
    updatedRange: writtenTabs.join(', '),
  });
}
