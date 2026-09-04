import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

function extractSheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

// Quotes the tab name for the Sheets API range; only encodes the tab name (spaces etc.), not ! or the range.
function sheetRange(tab: string, range: string): string {
  const safeTab = tab.replace(/'/g, "''");
  return `${encodeURIComponent(`'${safeTab}'`)}!${range}`;
}

// Match Gemini's returned tab name against the actual tab list (case-insensitive)
function resolveTab(geminiTab: string, existingTabs: string[]): string | null {
  const norm = (s: string) => s.trim().toLowerCase();
  return (
    existingTabs.find((t) => norm(t) === norm(geminiTab)) ??
    existingTabs.find((t) => norm(t).includes(norm(geminiTab)) || norm(geminiTab).includes(norm(t))) ??
    null
  );
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

interface SheetStructure {
  tabs: string[];
  tabHeaderMap: Record<string, string[]>;       // all headers (for building the write row)
  tabWritableHeaders: Record<string, string[]>; // non-formula headers only (for Gemini prompt)
}

async function fetchTabHeaders(
  sheetId: string,
  tab: string,
  accessToken: string,
): Promise<{ headers: string[]; writableHeaders: string[] } | null> {
  const [row1Res, row2Res] = await Promise.all([
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tab, 'A1:ZZ1')}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tab, 'A2:ZZ2')}?valueRenderOption=FORMULA`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!row1Res.ok) return null;
  const row1Data = await row1Res.json();
  const headers: string[] = (row1Data.values?.[0] ?? []).filter(
    (h: unknown) => typeof h === 'string' && (h as string).trim(),
  );
  if (headers.length === 0) return null;

  const row2Values: string[] = row2Res.ok ? ((await row2Res.json()).values?.[0] ?? []) : [];
  const formulaCols = new Set<string>(
    headers.filter((_, idx) => typeof row2Values[idx] === 'string' && (row2Values[idx] as string).startsWith('=')),
  );

  return {
    headers,
    writableHeaders: headers.filter((h) => !formulaCols.has(h)),
  };
}

async function fetchSheetStructure(sheetId: string, accessToken: string): Promise<SheetStructure> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) return { tabs: [], tabHeaderMap: {}, tabWritableHeaders: {} };
  const meta = await metaRes.json();
  const tabs: string[] = (meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title);

  const tabHeaderMap: Record<string, string[]> = {};
  const tabWritableHeaders: Record<string, string[]> = {};

  // Read up to 50 tabs (increased from 15)
  await Promise.all(
    tabs.slice(0, 50).map(async (tab) => {
      const result = await fetchTabHeaders(sheetId, tab, accessToken);
      if (result) {
        tabHeaderMap[tab] = result.headers;
        tabWritableHeaders[tab] = result.writableHeaders;
      }
    }),
  );

  return { tabs, tabHeaderMap, tabWritableHeaders };
}

interface GeminiMapping {
  index: number;
  pestana_destino: string;
  datos_fila: Record<string, string | number | null>;
}

interface GeminiResult {
  mappings: GeminiMapping[] | null;
  called: boolean;
  reason?: string;
}

async function mapWithGemini(
  invoices: Record<string, unknown>[],
  tabWritableHeaders: Record<string, string[]>,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { mappings: null, called: false, reason: 'no_api_key' };
  if (Object.keys(tabWritableHeaders).length === 0) return { mappings: null, called: false, reason: 'no_writable_headers' };

  const sheetStructure = Object.entries(tabWritableHeaders).map(([nombre, columnas]) => ({ nombre, columnas }));

  const prompt = `Sos el motor de mapeo contable de ritto.lat para Uruguay y Argentina.

ESTRUCTURA DE LA PLANILLA DEL USUARIO:
${JSON.stringify({ pestañas_disponibles: sheetStructure }, null, 2)}

FACTURAS A PROCESAR:
${JSON.stringify(invoices.map((inv, i) => ({ index: i, ...inv })), null, 2)}

REGLAS (en orden de prioridad):
1. PRIORIDAD MÁXIMA — Si el nombre del proveedor/emisor de la factura coincide con el nombre de una pestaña (exacto o parcialmente, ignorando mayúsculas/acentos), usá ESA pestaña. Ejemplo: proveedor "Loazzolo S.A." → pestaña "Loazzolo".
2. Si no hay coincidencia por proveedor, elegí por tipo: compra/gasto → pestaña de gastos/proveedores; venta → pestaña de ventas/clientes.
3. Mapeá cada campo al nombre EXACTO de la columna de esa pestaña. Si ninguna columna coincide con un campo, no lo incluyas.
4. Si una columna no tiene dato, usá null.
5. Fechas en formato YYYY-MM-DD. Montos sin símbolo de moneda, solo número.
6. Si el tipo de documento contiene "Crédito" o "Nota de Crédito", los montos van negativos.
7. Si ninguna pestaña aplica, usá la primera pestaña disponible.

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
    if (!geminiRes.ok) {
      let errMsg = geminiRes.statusText;
      try { errMsg = ((await geminiRes.json()) as { error?: { message?: string } })?.error?.message ?? errMsg; } catch { /* ignore */ }
      return { mappings: null, called: true, reason: `api_${geminiRes.status}: ${errMsg}` };
    }
    const geminiData = await geminiRes.json();
    const text: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) return { mappings: null, called: true, reason: 'empty_response' };
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return { mappings: null, called: true, reason: 'response_not_array' };
    return { mappings: parsed, called: true };
  } catch (e) {
    return { mappings: null, called: true, reason: `exception: ${String(e)}` };
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
): Promise<{ ok: boolean; status: number; error?: string; targetRow?: number }> {
  // Read column A to find the actual last row with data (avoids offset bug where
  // append writes to row 500+ because of formatted-but-empty cells).
  let nextRow = 2;
  const colARes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, 'A:A')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (colARes.ok) {
    const colAData = await colARes.json();
    const filled = (colAData.values ?? []).length;
    nextRow = Math.max(filled + 1, 2); // always below header row
  }

  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, `A${nextRow}`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    },
  );
  if (!r.ok) {
    try {
      const body = await r.json();
      return { ok: false, status: r.status, error: body?.error?.message ?? r.statusText };
    } catch {
      return { ok: false, status: r.status, error: r.statusText };
    }
  }
  return { ok: true, status: r.status, targetRow: nextRow };
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

function findBestTab(tabs: string[], providerName?: string): string {
  if (providerName) {
    const np = normStr(providerName);
    for (const tab of tabs) {
      const nt = normStr(tab);
      if (nt && np && (nt === np || np.includes(nt) || nt.includes(np))) return tab;
    }
  }
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
    const { tabs: existingTabs, tabHeaderMap, tabWritableHeaders } = await fetchSheetStructure(sheetId, accessToken);

    if (!existingTabs.length) {
      return res.status(400).json({ error: 'No se pudieron obtener las pestañas de la planilla. Revisá la URL y los permisos.' });
    }

    let totalRows = 0;
    const writtenTabs: string[] = [];

    const geminiResult = await mapWithGemini(invoices, tabWritableHeaders);
    const geminiMappings = geminiResult.mappings;
    const useGemini = geminiMappings && geminiMappings.length === invoices.length;

    const invoiceDebug: Array<{
      index: number;
      resolvedTab: string;
      headersCount: number;
      rowAttempted: boolean;
      appendStatus: number | null;
      appendError: string | null;
    }> = [];

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];

      let tabName: string;
      let datosFila: Record<string, string | number | null>;

      if (useGemini) {
        const gm = geminiMappings.find((m) => m.index === i) ?? geminiMappings[i];
        const geminiTab = gm?.pestana_destino ?? '';
        tabName = (geminiTab && resolveTab(geminiTab, existingTabs)) || findBestTab(existingTabs) || FALLBACK_TAB;
        datosFila = gm?.datos_fila ?? {};
      } else {
        const provider = typeof inv.proveedor === 'string' ? inv.proveedor : undefined;
        tabName = findBestTab(existingTabs, provider) || FALLBACK_TAB;
        const tabHeaders = tabHeaderMap[tabName];
        datosFila = tabHeaders ? fallbackMapInvoice(inv, tabHeaders) : {};
      }

      // If headers not cached (tab > 50), fetch on demand
      if (!tabHeaderMap[tabName] && existingTabs.includes(tabName)) {
        const result = await fetchTabHeaders(sheetId, tabName, accessToken);
        if (result) {
          tabHeaderMap[tabName] = result.headers;
          tabWritableHeaders[tabName] = result.writableHeaders;
        }
      }

      const tabHeaders = tabHeaderMap[tabName];
      const debugEntry: (typeof invoiceDebug)[0] = {
        index: i,
        resolvedTab: tabName,
        headersCount: tabHeaders?.length ?? 0,
        rowAttempted: false,
        appendStatus: null,
        appendError: null,
      };

      if (!tabHeaders || tabHeaders.length === 0) {
        invoiceDebug.push(debugEntry);
        continue;
      }

      await ensureTab(sheetId, tabName, accessToken, existingTabs);

      const row = tabHeaders.map((col) => {
        const val = datosFila[col];
        return val == null ? '' : val;
      });

      debugEntry.rowAttempted = true;
      const result = await appendRow(sheetId, tabName, row, accessToken);
      debugEntry.appendStatus = result.status;
      debugEntry.appendError = result.error ?? null;

      if (result.ok) {
        totalRows++;
        if (!writtenTabs.includes(tabName)) writtenTabs.push(tabName);
      }
      invoiceDebug.push(debugEntry);
    }

    return res.status(200).json({
      ok: totalRows > 0,
      rowsAdded: totalRows,
      tabs: writtenTabs,
      updatedRange: writtenTabs.join(', '),
      engine: useGemini ? 'gemini' : 'fallback',
      _debug: {
        existingTabs,
        tabsWithHeaders: Object.keys(tabHeaderMap),
        geminiCalled: geminiResult.called,
        geminiReason: geminiResult.reason ?? null,
        geminiMappings: useGemini ? geminiMappings : null,
        invoices: invoiceDebug,
      },
    });
  } catch (err) {
    console.error('[append] unhandled error:', err);
    return res.status(500).json({ error: 'Error interno al exportar. Intentá de nuevo o escribinos a soporte@ritto.lat' });
  }
}
