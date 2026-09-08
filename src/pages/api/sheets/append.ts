import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

function extractSheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : urlOrId;
}

// Quotes and URL-encodes a tab name + range for use in URL paths.
// encodeURIComponent on the full string ensures : in ranges like A:A or A1:ZZ1
// is sent as %3A, preventing the Sheets API from misreading it as a custom method suffix.
function plainRange(tab: string, range: string): string {
  return `'${tab.replace(/'/g, "''")}'!${range}`;
}

function sheetRange(tab: string, range: string): string {
  return encodeURIComponent(plainRange(tab, range));
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
  tabHeaderMap: Record<string, string[]>;
  tabWritableHeaders: Record<string, string[]>;
  tabSampleRows: Record<string, string[][]>;
  tabGidMap: Record<string, number>;
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
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) return { tabs: [], tabHeaderMap: {}, tabWritableHeaders: {}, tabSampleRows: {}, tabGidMap: {} };
  const meta = await metaRes.json();
  const sheetMetas: Array<{ properties: { title: string; sheetId: number } }> = meta.sheets ?? [];
  const tabs: string[] = sheetMetas.map((s) => s.properties.title);
  const tabGidMap: Record<string, number> = {};
  for (const s of sheetMetas) tabGidMap[s.properties.title] = s.properties.sheetId;

  const tabHeaderMap: Record<string, string[]> = {};
  const tabWritableHeaders: Record<string, string[]> = {};
  const tabSampleRows: Record<string, string[][]> = {};

  const tabs50 = tabs.slice(0, 50);
  if (tabs50.length === 0) return { tabs, tabHeaderMap, tabWritableHeaders, tabSampleRows, tabGidMap };

  // 3 batchGet calls: row 1 (headers), row 2 (formula detection), rows 3-6 (data examples)
  const batchRow1Url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  const batchRow2Url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  const batchSampleUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  batchRow2Url.searchParams.set('valueRenderOption', 'FORMULA');

  for (const tab of tabs50) {
    const safeTab = `'${tab.replace(/'/g, "''")}'`;
    batchRow1Url.searchParams.append('ranges', `${safeTab}!A1:ZZ1`);
    batchRow2Url.searchParams.append('ranges', `${safeTab}!A2:ZZ2`);
    batchSampleUrl.searchParams.append('ranges', `${safeTab}!A3:ZZ6`);
  }

  const [batchRow1Res, batchRow2Res, batchSampleRes] = await Promise.all([
    fetch(batchRow1Url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(batchRow2Url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } }),
    fetch(batchSampleUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } }),
  ]);

  if (!batchRow1Res.ok) return { tabs, tabHeaderMap, tabWritableHeaders, tabSampleRows, tabGidMap };

  const batchRow1Data = await batchRow1Res.json() as { valueRanges?: Array<{ values?: string[][] }> };
  const batchRow2Data = batchRow2Res.ok
    ? await batchRow2Res.json() as { valueRanges?: Array<{ values?: string[][] }> }
    : null;
  const batchSampleData = batchSampleRes.ok
    ? await batchSampleRes.json() as { valueRanges?: Array<{ values?: string[][] }> }
    : null;

  const row1Ranges = batchRow1Data.valueRanges ?? [];
  const row2Ranges = batchRow2Data?.valueRanges ?? [];
  const sampleRanges = batchSampleData?.valueRanges ?? [];

  for (let i = 0; i < tabs50.length; i++) {
    const tab = tabs50[i];
    const headers: string[] = (row1Ranges[i]?.values?.[0] ?? []).filter(
      (h: unknown) => typeof h === 'string' && (h as string).trim(),
    );
    if (headers.length === 0) continue;

    const row2Values: string[] = row2Ranges[i]?.values?.[0] ?? [];
    const formulaCols = new Set<string>(
      headers.filter((_, idx) => typeof row2Values[idx] === 'string' && (row2Values[idx] as string).startsWith('=')),
    );

    tabHeaderMap[tab] = headers;
    tabWritableHeaders[tab] = headers.filter((h) => !formulaCols.has(h));
    tabSampleRows[tab] = (sampleRanges[i]?.values ?? []).slice(0, 4);
  }

  return { tabs, tabHeaderMap, tabWritableHeaders, tabSampleRows, tabGidMap };
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
  tabSampleRows: Record<string, string[][]>,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { mappings: null, called: false, reason: 'no_api_key' };
  if (Object.keys(tabWritableHeaders).length === 0) return { mappings: null, called: false, reason: 'no_writable_headers' };

  const sheetStructure = Object.entries(tabWritableHeaders).map(([nombre, columnas]) => ({
    nombre,
    columnas,
    filas_ejemplo: (tabSampleRows[nombre] ?? []).slice(0, 4),
  }));

  const prompt = `Sos el motor de mapeo contable de ritto.lat para Uruguay y Argentina.
Cada usuario tiene su propia planilla con columnas y formatos completamente personalizados.
Tu tarea es entender la intención de cada columna usando su nombre Y los valores de ejemplo reales que ya existen en esa pestaña.

ESTRUCTURA DE LA PLANILLA DEL USUARIO (nombre + columnas escribibles + filas_ejemplo reales):
${JSON.stringify({ pestañas_disponibles: sheetStructure }, null, 2)}

FACTURAS A PROCESAR:
${JSON.stringify(invoices.map((inv, i) => ({ index: i, ...inv })), null, 2)}

REGLAS (en orden estricto de prioridad):

1. SELECCIÓN DE PESTAÑA:
   - Si el proveedor/emisor de la factura coincide (exacto o parcial, ignorando mayúsculas/acentos) con el nombre de una pestaña, usá ESA pestaña. Ej: "Loazzolo S.A." → "Loazzolo".
   - Si no hay coincidencia, elegí por tipo: compra/gasto → pestaña de gastos; venta → pestaña de ventas.
   - Si ninguna aplica, usá la primera pestaña disponible.

2. MAPEO DE COLUMNAS — FORMATO EXACTO (crítico):
   - Usá las filas_ejemplo para copiar el formato EXACTO de cada tipo de dato:
     * Fechas: si el ejemplo tiene "9/3/2026" → usá D/M/YYYY. Si tiene "2026-03-09" → usá ISO.
     * Montos: si el ejemplo tiene "$6,121.00" → escribí "$2,840.00" (mismo símbolo y decimales). Si tiene "6121" → escribí sin símbolo.
     * Textos: copiá el estilo exacto de los ejemplos (mayúsculas, espacios, etc.).
   - Mapeá al nombre EXACTO de la columna.
   - Si no tenés dato suficiente para una columna, escribí null — NUNCA inventes valores.

3. COLUMNAS DE TOTALES ACUMULADOS — PROHIBIDO TOCAR:
   - Columnas como "TOTAL MES", "TOTAL MESA", "SUBTOTAL", "ACUMULADO", "TOTAL MENSUAL" son fórmulas =SUM() del usuario que suman MÚLTIPLES facturas del mes. NO representan el monto de UNA factura. Asignales SIEMPRE null.
   - IMPORTANTE: el monto facturado (total de la factura) va ÚNICAMENTE en columnas como "Costo", "Monto", "Importe", "Precio", "Valor", nunca en columnas de totales acumulados.

4. REGLA DE ORO — NO INVENTAR (la más importante):
   - Solo llenás una columna si su valor está EXPLÍCITAMENTE en los datos de la factura (N° de factura, fecha de emisión, montos, RUT, razón social, etc.).
   - "Fecha de pago" = la fecha en que la empresa pagó la factura. ESO NO ESTÁ en el CFE (el CFE solo tiene fecha de EMISIÓN). "Fecha de pago" → siempre null.
   - "Fecha de factura" o "Fecha de emisión" = la fecha que aparece en el CFE → podés usarla.
   - Columnas de estado (ej: "Estado pedido", "Estado pago"), columnas derivadas (ej: "Deuda"), y cualquier campo que no puedas leer directamente del CFE → siempre null.
   - Si el tipo de documento contiene "Crédito" o "Nota de Crédito", los montos numéricos van negativos.

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

// Converts a 0-based column index to a Sheets column letter (0→A, 25→Z, 26→AA, …)
function colLetter(idx: number): string {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    s = String.fromCharCode(((n - 1) % 26) + 65) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// `row` is aligned 1:1 with the tab's headers. null means "this cell is not ours" —
// a formula column or a field Ritto must never fill — and is skipped entirely.
async function appendRow(
  sheetId: string,
  tabName: string,
  row: (string | number | null)[],
  accessToken: string,
): Promise<{ ok: boolean; status: number; error?: string; targetRow?: number }> {
  // Measure occupancy on a column Ritto actually fills with a value. A column it
  // only ever blanks would read as empty forever and every export would land on
  // row 2, on top of the previous one.
  const valuedIdx = row.findIndex((v) => v !== null && v !== '');
  const ownedIdx = row.findIndex((v) => v !== null);
  const checkCol = colLetter(valuedIdx >= 0 ? valuedIdx : Math.max(ownedIdx, 0));

  let nextRow = 2;
  const colRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, `${checkCol}:${checkCol}`)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (colRes.ok) {
    const colData = (await colRes.json()) as { values?: string[][] };
    const cells = colData.values ?? [];
    // Take the FIRST free row, not the one after the last used cell. These templates
    // usually carry a totals row, a second block or notes well below the data, and
    // counting to the end drops the invoice underneath all of it — outside the rows
    // the =SUM() formulas cover, which is exactly what "queda afuera" looks like.
    let free = -1;
    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i]?.[0];
      if (cell == null || String(cell).trim() === '') { free = i + 1; break; }
    }
    nextRow = free > 0 ? free : Math.max(cells.length + 1, 2);
  }

  // A single PUT over A:N would blank every protected cell in between, because ""
  // clears a formula just as surely as a value does. So split the row into runs of
  // consecutive owned cells and write each run as its own range — the protected
  // columns are never part of any request and keep whatever the user put there.
  const segments: Array<{ start: number; values: (string | number)[] }> = [];
  let run: { start: number; values: (string | number)[] } | null = null;
  for (let i = 0; i < row.length; i++) {
    const v = row[i];
    if (v === null) {
      if (run) { segments.push(run); run = null; }
      continue;
    }
    if (!run) run = { start: i, values: [] };
    run.values.push(v);
  }
  if (run) segments.push(run);

  const filled = segments.filter((s) => s.values.some((v) => v !== '' && v != null));
  if (filled.length === 0) return { ok: false, status: 400, error: 'empty_row_after_trim' };

  const data = filled.map((s) => ({
    range: plainRange(tabName, `${colLetter(s.start)}${nextRow}:${colLetter(s.start + s.values.length - 1)}${nextRow}`),
    values: [s.values],
  }));

  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
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

// Columns Ritto must never fill, whatever the model returns for them. A payment date
// simply is not in a CFE — the document only carries the issue date — and a monthly
// accumulator sums many invoices, so one invoice's amount does not belong there.
// The formula check already catches most of these; this covers the rest, e.g. the
// first export into a template whose =SUM() rows have not been written yet.
const PROTECTED_HEADER = /(fecha|dia)\s*(de\s*)?(pago|cobro)|(total|subtotal)\s*(del\s*)?mes\b|acumulad/;

function isProtectedHeader(header: string): boolean {
  return PROTECTED_HEADER.test(normStr(header));
}

// An amount that arrives already formatted ("$2,840.00") is parsed against the
// spreadsheet's own locale. In a sheet set to Uruguay that string does not read as
// two thousand eight hundred and forty, so it lands as text — and text is skipped by
// =SUM(), which is why the totals stop adding up. Turn anything that is purely an
// amount into a real number and let the column's own format display it.
// Document numbers ("A-284741") and dates ("2026-09-02", "27/8/2026") never match.
function parseAmount(value: string): number | null {
  const s = value.trim();
  if (!/^-?\s*(?:U\$S|USD|UYU|\$)?\s*-?[\d.,]+$/i.test(s)) return null;
  const body = s.replace(/[^\d.,]/g, '');
  if (!body || !/\d/.test(body)) return null;

  const lastDot = body.lastIndexOf('.');
  const lastComma = body.lastIndexOf(',');
  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = body;
  } else {
    const decIdx = Math.max(lastDot, lastComma);
    const sep = body[decIdx];
    const onlySeparator = (lastDot === -1) !== (lastComma === -1) && body.indexOf(sep) === decIdx;
    // A lone separator with exactly three digits after it groups thousands ("1,500"),
    // it does not mark decimals.
    if (onlySeparator && body.length - decIdx - 1 === 3) normalized = body.replace(/[.,]/g, '');
    else normalized = `${body.slice(0, decIdx).replace(/[.,]/g, '')}.${body.slice(decIdx + 1)}`;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return /^-/.test(s) ? -Math.abs(n) : n;
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
    const { tabs: existingTabs, tabHeaderMap, tabWritableHeaders, tabSampleRows, tabGidMap } = await fetchSheetStructure(sheetId, accessToken);

    if (!existingTabs.length) {
      return res.status(400).json({ error: 'No se pudieron obtener las pestañas de la planilla. Revisá la URL y los permisos.' });
    }

    let totalRows = 0;
    const writtenTabs: string[] = [];

    const geminiResult = await mapWithGemini(invoices, tabWritableHeaders, tabSampleRows);
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

      // One cell per header, in header order — never a concatenation, so a value can
      // never slide into the neighbouring column. Cells Ritto does not own become
      // null and are left untouched rather than blanked.
      const writable = new Set(tabWritableHeaders[tabName] ?? tabHeaders);
      const row: (string | number | null)[] = tabHeaders.map((col) => {
        if (!writable.has(col) || isProtectedHeader(col)) return null;
        const val = datosFila[col];
        if (val == null) return '';
        if (typeof val === 'number') return val;
        return parseAmount(val) ?? val;
      });

      // Don't write a row where every cell is empty (fallback had no alias matches)
      const hasData = row.some((v) => v !== '' && v != null);
      if (!hasData) {
        debugEntry.appendError = 'skipped_empty_row';
        invoiceDebug.push(debugEntry);
        continue;
      }

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

    const primaryTab = writtenTabs[0];
    const primaryGid = primaryTab != null ? tabGidMap[primaryTab] : undefined;
    const baseSheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    const redirectUrl = primaryGid != null ? `${baseSheetUrl}#gid=${primaryGid}` : baseSheetUrl;

    return res.status(200).json({
      ok: totalRows > 0,
      rowsAdded: totalRows,
      tabs: writtenTabs,
      updatedRange: writtenTabs.join(', '),
      redirectUrl: totalRows > 0 ? redirectUrl : undefined,
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
    return res.status(500).json({ error: 'Error interno al exportar. Intentá de nuevo o escribinos a santiagososa2424@gmail.com' });
  }
}
