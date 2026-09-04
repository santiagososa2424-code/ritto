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

async function fetchSheetStructure(
  sheetId: string,
  accessToken: string,
): Promise<{ tabs: string[]; tabHeaderMap: Record<string, string[]> }> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) return { tabs: [], tabHeaderMap: {} };
  const meta = await metaRes.json();
  const tabs: string[] = (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);

  const tabHeaderMap: Record<string, string[]> = {};
  for (const tab of tabs.slice(0, 15)) {
    const enc = encodeURIComponent(tab);
    const rowRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}!A1:ZZ1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!rowRes.ok) continue;
    const rowData = await rowRes.json();
    const headers: string[] = (rowData.values?.[0] ?? []).filter(
      (h: unknown) => typeof h === 'string' && (h as string).trim(),
    );
    if (headers.length > 0) tabHeaderMap[tab] = headers;
  }

  return { tabs, tabHeaderMap };
}

interface GeminiMapping {
  index: number;
  pestana_destino: string;
  datos_fila: Record<string, string | number | null>;
}

async function mapWithGemini(
  invoices: Record<string, unknown>[],
  tabHeaderMap: Record<string, string[]>,
): Promise<GeminiMapping[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || Object.keys(tabHeaderMap).length === 0) return null;

  const sheetStructure = Object.entries(tabHeaderMap).map(([nombre, columnas]) => ({ nombre, columnas }));

  const prompt = `Sos el motor de mapeo contable de ritto.lat para Uruguay y Argentina.

ESTRUCTURA DE LA PLANILLA DEL USUARIO:
${JSON.stringify({ pestañas_disponibles: sheetStructure }, null, 2)}

FACTURAS A PROCESAR:
${JSON.stringify(invoices.map((inv, i) => ({ index: i, ...inv })), null, 2)}

REGLAS:
1. Elegí la pestaña más adecuada para cada factura: si es una compra/gasto (el usuario es Receptor/comprador), usá pestañas de gastos o proveedores. Si es una venta (usuario es Emisor), usá pestañas de ventas o clientes.
2. Mapeá cada campo al nombre EXACTO de la columna de esa pestaña. Si ninguna columna coincide con un campo, no lo incluyas.
3. Si una columna no tiene dato, usá null.
4. Fechas en formato YYYY-MM-DD. Montos sin símbolo de moneda, solo número.
5. Si el tipo de documento contiene "Crédito" o "Nota de Crédito", los montos van negativos.
6. Si ninguna pestaña aplica claramente, usá la primera pestaña disponible.

Respondé ÚNICAMENTE con un array JSON válido, un objeto por factura:
[
  {
    "index": 0,
    "pestana_destino": "Nombre Exacto Pestaña",
    "datos_fila": {
      "Nombre Exacto Columna": "valor"
    }
  }
]`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      },
    );
    if (!geminiRes.ok) return null;
    const geminiData = await geminiRes.json();
    const text: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function ensureTab(sheetId: string, tabName: string, accessToken: string, existing: string[]): Promise<void> {
  if (existing.includes(tabName)) return;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tabName } } }] }),
  });
}

async function appendRow(
  sheetId: string,
  tabName: string,
  row: (string | number)[],
  accessToken: string,
): Promise<boolean> {
  const enc = encodeURIComponent(tabName);
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    },
  );
  return r.ok;
}

// Fallback: simple alias-based column matching (used when Gemini is unavailable)
const FIELD_ALIASES: Record<string, string[]> = {
  proveedor: ['proveedor', 'empresa', 'supplier', 'vendedor', 'emisor', 'razon social', 'nombre', 'comercio', 'distribuidor'],
  rut: ['rut', 'cuit', 'nit', 'id fiscal', 'identificacion fiscal', 'ruc', 'rut proveedor', 'rut emisor'],
  fecha: ['fecha', 'fecha factura', 'fecha emision', 'fecha de emision', 'date', 'fecha comprobante'],
  nroDocumento: ['numero', 'n', 'factura n', 'numero factura', 'nro factura', 'nro doc', 'comprobante', 'serie', 'serie / numero'],
  tipoDocumento: ['tipo', 'tipo documento', 'tipo comprobante', 'tipo de cfe', 'tipo cfe'],
  moneda: ['moneda', 'currency', 'divisa'],
  neto: ['neto', 'subtotal', 'base imponible', 'monto neto', 'base', 'subtotal tasa basica'],
  ivaTotal: ['iva', 'impuesto', 'tax', 'total iva', 'iva 22', 'iva22'],
  total: ['total', 'monto', 'importe', 'monto total', 'valor total', 'total factura', 'amount'],
};

function normStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function fallbackMapInvoice(
  inv: Record<string, unknown>,
  tabHeaders: string[],
): Record<string, string | number | null> {
  const isNC = typeof inv.tipoDocumento === 'string' && /cr[eé]dito/i.test(inv.tipoDocumento);
  const NUMERIC_SIGN = new Set(['neto', 'iva10', 'iva22', 'ivaTotal', 'total']);
  const result: Record<string, string | number | null> = {};

  for (const col of tabHeaders) {
    const normCol = normStr(col);
    let matched = false;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => normCol === a || normCol.includes(a) || a.includes(normCol))) {
        const v = inv[field];
        if (v != null) {
          if (typeof v === 'number' && isNC && NUMERIC_SIGN.has(field)) {
            result[col] = -v;
          } else {
            result[col] = typeof v === 'number' ? v : String(v);
          }
        } else {
          result[col] = null;
        }
        matched = true;
        break;
      }
    }
    if (!matched) result[col] = null;
  }
  return result;
}

function findBestTab(tabs: string[]): string {
  const gastoKeywords = ['gasto', 'proveedor', 'compra', 'egreso', 'costo', 'factura'];
  for (const tab of tabs) {
    const nt = normStr(tab);
    if (gastoKeywords.some((k) => nt.includes(k))) return tab;
  }
  return tabs[0];
}

const FALLBACK_TAB = 'Ritto - Sin clasificar';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { invoices } = req.body as { invoices: Record<string, unknown>[] };
    if (!invoices?.length) return res.status(400).json({ error: 'invoices es requerido' });

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
    const { tabs: existingTabs, tabHeaderMap } = await fetchSheetStructure(sheetId, accessToken);

    if (!existingTabs.length) {
      return res.status(400).json({ error: 'No se pudieron obtener las pestañas de la planilla. Revisá la URL y los permisos.' });
    }

    let totalRows = 0;
    const writtenTabs: string[] = [];

    // Try Gemini mapping first
    const geminiMappings = await mapWithGemini(invoices, tabHeaderMap);
    const useGemini = geminiMappings && geminiMappings.length === invoices.length;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];

      let tabName: string;
      let datosFila: Record<string, string | number | null>;

      if (useGemini) {
        const gm = geminiMappings.find((m) => m.index === i) ?? geminiMappings[i];
        tabName = gm?.pestana_destino || findBestTab(existingTabs) || FALLBACK_TAB;
        datosFila = gm?.datos_fila ?? {};
      } else {
        tabName = findBestTab(existingTabs) || FALLBACK_TAB;
        const tabHeaders = tabHeaderMap[tabName];
        datosFila = tabHeaders ? fallbackMapInvoice(inv, tabHeaders) : {};
      }

      const tabHeaders = tabHeaderMap[tabName];
      if (!tabHeaders || tabHeaders.length === 0) continue;

      await ensureTab(sheetId, tabName, accessToken, existingTabs);

      const row = tabHeaders.map((col) => {
        const val = datosFila[col];
        return val == null ? '' : val;
      });

      const ok = await appendRow(sheetId, tabName, row, accessToken);
      if (ok) {
        totalRows++;
        if (!writtenTabs.includes(tabName)) writtenTabs.push(tabName);
      }
    }

    return res.status(200).json({
      ok: true,
      rowsAdded: totalRows,
      tabs: writtenTabs,
      updatedRange: writtenTabs.join(', '),
      engine: useGemini ? 'gemini' : 'fallback',
    });
  } catch (err) {
    console.error('[append] unhandled error:', err);
    return res.status(500).json({ error: 'Error interno al exportar. Intentá de nuevo o escribinos a soporte@ritto.lat' });
  }
}
