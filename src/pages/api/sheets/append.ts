import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';
import { parseAmount } from '../../../lib/money';
import { profileColumns, fitsColumn, isProtectedHeader } from '../../../lib/sheetProfile';
import { fechaComparable, ordenPorFecha, elegirFilaDestino, type OrdenFecha } from '../../../lib/sheetLayout';
import { GHOST_COLUMN, isGhost, findHeaderRow, namedHeaders, formulaColumns } from '../../../lib/sheetHeaders';
import { vendorKeys, reglaAprendida } from '../../../lib/vendorRules';
import { logError } from '../../../lib/errorLog';

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
  tabHeaderRow: Record<string, number>;
}

const EMPTY_STRUCTURE: SheetStructure = {
  tabs: [], tabHeaderMap: {}, tabWritableHeaders: {}, tabSampleRows: {}, tabGidMap: {}, tabHeaderRow: {},
};

async function fetchTabHeaders(
  sheetId: string,
  tab: string,
  accessToken: string,
): Promise<{ headers: string[]; writableHeaders: string[]; headerRow: number } | null> {
  const headRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tab, 'A1:ZZ10')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!headRes.ok) return null;
  const rows: string[][] = (await headRes.json()).values ?? [];
  if (rows.length === 0) return null;

  const headerRow = findHeaderRow(rows);
  const headers = namedHeaders(rows[headerRow - 1] ?? []);
  if (headers.length === 0 || headers.every(isGhost)) return null;

  const formulaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tab, `A${headerRow + 1}:ZZ${headerRow + 20}`)}?valueRenderOption=FORMULA`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const formulaRows: string[][] = formulaRes.ok ? ((await formulaRes.json()).values ?? []) : [];
  const withFormula = formulaColumns(headers, formulaRows);

  return {
    headers,
    writableHeaders: headers.filter((h) => !withFormula.has(h) && !isGhost(h)),
    headerRow,
  };
}

async function fetchSheetStructure(sheetId: string, accessToken: string): Promise<SheetStructure> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!metaRes.ok) return EMPTY_STRUCTURE;
  const meta = await metaRes.json();
  const sheetMetas: Array<{ properties: { title: string; sheetId: number } }> = meta.sheets ?? [];
  const tabs: string[] = sheetMetas.map((s) => s.properties.title);
  const tabGidMap: Record<string, number> = {};
  for (const s of sheetMetas) tabGidMap[s.properties.title] = s.properties.sheetId;

  const tabHeaderMap: Record<string, string[]> = {};
  const tabWritableHeaders: Record<string, string[]> = {};
  const tabSampleRows: Record<string, string[][]> = {};
  const tabHeaderRow: Record<string, number> = {};

  const tabs50 = tabs.slice(0, 50);
  const base = { tabs, tabHeaderMap, tabWritableHeaders, tabSampleRows, tabGidMap, tabHeaderRow };
  if (tabs50.length === 0) return base;

  const quote = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

  // Primera lectura: las diez filas de arriba de cada pestaña. De ahí sale dónde están
  // los encabezados y, de paso, las filas de ejemplo que siguen — sin pedir nada extra.
  const headUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  for (const tab of tabs50) headUrl.searchParams.append('ranges', `${quote(tab)}!A1:ZZ10`);

  const headRes = await fetch(headUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!headRes.ok) return base;
  const headRanges = ((await headRes.json()) as { valueRanges?: Array<{ values?: string[][] }> }).valueRanges ?? [];

  const layout: Array<{ tab: string; headers: string[]; headerRow: number }> = [];
  for (let i = 0; i < tabs50.length; i++) {
    const rows = headRanges[i]?.values ?? [];
    if (rows.length === 0) continue;
    const headerRow = findHeaderRow(rows);
    const headers = namedHeaders(rows[headerRow - 1] ?? []);
    if (headers.length === 0 || headers.every(isGhost)) continue;

    layout.push({ tab: tabs50[i], headers, headerRow });
    tabHeaderMap[tabs50[i]] = headers;
    tabHeaderRow[tabs50[i]] = headerRow;
    // Todas las que entraron en la lectura, no cuatro. Con cuatro, una pestaña cuyas
    // primeras filas están vacías —un mes que recién arranca, o un template con espacio
    // arriba— quedaba perfilada como "sin datos" y ahí Ritto deja de reconocer cuál es
    // la columna de fechas, que es lo que necesita para ordenar.
    tabSampleRows[tabs50[i]] = rows.slice(headerRow);
  }
  if (layout.length === 0) return base;

  // Segunda lectura: veinte filas de datos por pestaña, pidiendo las fórmulas en vez de
  // sus resultados. Se hace aparte porque el rango arranca donde termina el encabezado,
  // que recién ahora sabemos y es distinto en cada pestaña.
  const formulaUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet`);
  formulaUrl.searchParams.set('valueRenderOption', 'FORMULA');
  for (const { tab, headerRow } of layout) {
    formulaUrl.searchParams.append('ranges', `${quote(tab)}!A${headerRow + 1}:ZZ${headerRow + 20}`);
  }

  const formulaRes = await fetch(formulaUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const formulaRanges = formulaRes.ok
    ? ((await formulaRes.json()) as { valueRanges?: Array<{ values?: string[][] }> }).valueRanges ?? []
    : [];

  for (let i = 0; i < layout.length; i++) {
    const { tab, headers } = layout[i];
    const withFormula = formulaColumns(headers, formulaRanges[i]?.values ?? []);
    tabWritableHeaders[tab] = headers.filter((h) => !withFormula.has(h) && !isGhost(h));
  }

  return base;
}

interface GeminiMapping {
  index: number;
  pestana_destino: string;
  // El modelo tolera nombres abreviados que una comparación de texto no engancha
  // ("Multiv." para "MULTIVENTAS distribuciones"). Que declare él si la pestaña es la
  // del proveedor evita avisarle al usuario de un problema que no existe.
  es_pestana_del_proveedor?: boolean;
  datos_fila: Record<string, string | number | null>;
}

interface GeminiResult {
  mappings: GeminiMapping[] | null;
  called: boolean;
  reason?: string;
}

async function mapWithGemini(
  invoices: Record<string, unknown>[],
  tabColumnas: Record<string, string[]>,
  tabSampleRows: Record<string, string[][]>,
  forzadas: Record<string, string>,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { mappings: null, called: false, reason: 'no_api_key' };
  if (Object.keys(tabColumnas).length === 0) return { mappings: null, called: false, reason: 'no_writable_headers' };

  const sheetStructure = Object.entries(tabColumnas).map(([nombre, columnas]) => ({
    nombre,
    columnas,
    filas_ejemplo: (tabSampleRows[nombre] ?? []).slice(0, 4),
  }));

  const prompt = `Sos el motor de mapeo contable de ritto.lat para Uruguay y Argentina.
Cada usuario tiene su propia planilla con columnas y formatos completamente personalizados.
Tu tarea es entender la intención de cada columna usando su nombre Y los valores de ejemplo reales que ya existen en esa pestaña.

ESTRUCTURA DE LA PLANILLA DEL USUARIO (nombre + columnas + filas_ejemplo reales):
${JSON.stringify({ pestañas_disponibles: sheetStructure }, null, 2)}

${Object.keys(forzadas).length > 0 ? `PESTAÑA YA DECIDIDA POR EL USUARIO (no la discutas, mapeá las columnas de ESA pestaña):
${Object.entries(forzadas).map(([prov, tab]) => `- proveedor "${prov}" → pestaña "${tab}"`).join('\n')}

` : ''}FACTURAS A PROCESAR:
${JSON.stringify(invoices.map((inv, i) => ({ index: i, ...inv })), null, 2)}

REGLAS (en orden estricto de prioridad):

1. SELECCIÓN DE PESTAÑA:
   - Además marcá "es_pestana_del_proveedor": true solo si la pestaña elegida es la de
     ESE proveedor (aunque esté abreviada: "Multiv." es la de "MULTIVENTAS
     distribuciones"). Si la mandás a una pestaña general de gastos o a la primera
     porque no había ninguna del proveedor, poné false.
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
    "es_pestana_del_proveedor": true,
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

// Groups sorted column indexes into contiguous runs, so a set of columns can be
// addressed as a few ranges instead of one request per cell.
function runsOf(indexes: number[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  for (const i of [...indexes].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && i === last.end + 1) last.end = i;
    else runs.push({ start: i, end: i });
  }
  return runs;
}

// How far down the pre-built template reaches: the last row whose formula column
// still carries a formula. Past that line the tab is just empty space, and an
// invoice dropped there sits outside every total the user built.
async function templateLastRow(
  sheetId: string,
  tabName: string,
  formulaIdx: number[],
  accessToken: string,
  headerRow: number,
): Promise<number> {
  if (formulaIdx.length === 0) return 0;
  const col = colLetter(formulaIdx[0]);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, `${col}${headerRow + 1}:${col}`)}?valueRenderOption=FORMULA`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return 0;
  const cells = ((await res.json()) as { values?: string[][] }).values ?? [];
  let last = 0;
  for (let i = 0; i < cells.length; i++) {
    const v = cells[i]?.[0];
    if (typeof v === 'string' && v.startsWith('=')) last = i + headerRow + 1;
  }
  return last;
}

// Lee la columna de fechas de la pestaña y delega la decisión en sheetLayout.ts.
async function filaPorFecha(
  sheetId: string,
  tabName: string,
  colIdx: number,
  fecha: number,
  headerRow: number,
  lastTemplate: number,
  accessToken: string,
): Promise<OrdenFecha | null> {
  const col = colLetter(colIdx);
  const hasta = lastTemplate > headerRow ? String(lastTemplate) : '';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, `${col}${headerRow + 1}:${col}${hasta}`)}?valueRenderOption=UNFORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const cells = ((await res.json()) as { values?: unknown[][] }).values ?? [];
  return ordenPorFecha(cells.map((c) => c?.[0]), fecha, headerRow);
}

// Las celdas de una fila puntual, tal como están escritas: una fórmula vuelve como
// "=..." y no como su resultado. Es lo que permite preguntar por la celda concreta que
// vamos a ocupar en vez de por la columna entera.
async function rowCells(
  sheetId: string,
  tabName: string,
  rowNum: number,
  accessToken: string,
): Promise<string[]> {
  if (rowNum < 1) return [];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, `A${rowNum}:ZZ${rowNum}`)}?valueRenderOption=FORMULA`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const values = ((await res.json()) as { values?: string[][] }).values ?? [];
  return (values[0] ?? []).map((c) => (c == null ? '' : String(c)));
}

// `row` is aligned 1:1 with the tab's headers. null means "this cell is not ours" —
// a formula column or a field Ritto must never fill — and is skipped entirely.
// `tentative` lleva, en las columnas que la lectura de la columna entera dio por
// calculadas, el valor que Ritto escribiría si la celda de destino resultara libre.
async function appendRow(
  sheetId: string,
  tabName: string,
  row: (string | number | null)[],
  accessToken: string,
  tabGid: number | undefined,
  formulaIdx: number[],
  headerRow: number,
  tentative: (string | number | null)[] = [],
  orden: { colIdx: number; fecha: number } | null = null,
): Promise<{ ok: boolean; status: number; error?: string; targetRow?: number; grewTemplate?: boolean; writtenIdx?: number[]; ordenada?: boolean }> {
  // Measure occupancy on a column Ritto actually fills with a value. A column it
  // only ever blanks would read as empty forever and every export would land on
  // row 2, on top of the previous one.
  const valuedIdx = row.findIndex((v) => v !== null && v !== '');
  const ownedIdx = row.findIndex((v) => v !== null);
  const checkCol = colLetter(valuedIdx >= 0 ? valuedIdx : Math.max(ownedIdx, 0));

  const [colRes, lastTemplate] = await Promise.all([
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange(tabName, `${checkCol}${headerRow}:${checkCol}`)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),
    templateLastRow(sheetId, tabName, formulaIdx, accessToken, headerRow),
  ]);

  let used = 1;
  let checkCells: string[][] = [];
  if (colRes.ok) {
    checkCells = ((await colRes.json()) as { values?: string[][] }).values ?? [];
    used = checkCells.length;
  }

  // Si la pestaña viene ordenada por fecha, la factura va en su lugar y no al final.
  // Subir el lunes una factura de agosto la dejaba debajo de las de setiembre, porque
  // el orden que mandaba era el de subida de los archivos, no el de los comprobantes.
  const ordenFecha = orden && tabGid != null
    ? await filaPorFecha(sheetId, tabName, orden.colIdx, orden.fecha, headerRow, lastTemplate, accessToken)
    : null;

  // La decisión en sí vive en sheetLayout.ts, sin red de por medio, para poder probarla.
  const destino = elegirFilaDestino(
    checkCells.map((c) => c?.[0]),
    headerRow,
    lastTemplate,
    ordenFecha,
    tabGid != null,
  );
  let nextRow = destino.fila;
  let grewTemplate = destino.modo === 'insertar';
  // La factura va en la primera fila de datos y hay que correr una fila para abajo a
  // la que estaba ahí.
  let correrPrimera = destino.modo === 'correrPrimera';

  // Una columna puede tener fórmula en unas filas y no en otras. "Costo" suele llevar
  // la suma sólo en la línea de totales; "Deuda" una por cada fila. Mirar la columna
  // entera trata a las dos igual: bloquea Costo y la factura entra sin importe. Lo que
  // decide es la celda concreta que vamos a ocupar — o, si hay que insertar la fila, la
  // de arriba, que es de la que se hereda.
  // Normalmente se mira la fila de arriba, que es de la que se hereda. Pero si la
  // factura es la más vieja y entra pegada al encabezado, arriba no hay fila de datos:
  // el modelo a seguir es la que va a quedar debajo.
  const desdeArriba = !grewTemplate || nextRow - 1 > headerRow;
  let refRow = !grewTemplate ? nextRow : desdeArriba ? nextRow - 1 : nextRow;
  let ref = await rowCells(sheetId, tabName, refRow, accessToken);
  const esFormula = (cells: string[], i: number) => cells[i] != null && cells[i].startsWith('=');

  if (correrPrimera && tabGid != null) {
    const ins = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            insertDimension: {
              range: { sheetId: tabGid, dimension: 'ROWS', startIndex: headerRow + 1, endIndex: headerRow + 2 },
              inheritFromBefore: true,
            },
          },
          {
            // La primera factura baja entera —valores y fórmulas, con sus referencias
            // ya corregidas por Sheets— a la fila que se acaba de abrir.
            copyPaste: {
              source: { sheetId: tabGid, startRowIndex: headerRow, endRowIndex: headerRow + 1 },
              destination: { sheetId: tabGid, startRowIndex: headerRow + 1, endRowIndex: headerRow + 2 },
              pasteType: 'PASTE_NORMAL',
            },
          },
        ],
      }),
    });
    if (!ins.ok) {
      // No se pudo hacer lugar. Antes que pisar la primera factura del usuario, la
      // nuestra va al final aunque quede fuera de orden.
      correrPrimera = false;
      nextRow = Math.max(used + headerRow, lastTemplate + 1, headerRow + 1);
      refRow = nextRow;
      ref = await rowCells(sheetId, tabName, refRow, accessToken);
    }
  }

  if (grewTemplate && tabGid != null) {
    const requests: unknown[] = [{
      insertDimension: {
        range: { sheetId: tabGid, dimension: 'ROWS', startIndex: nextRow - 1, endIndex: nextRow },
        // borders, colours and number formats of the row above. Salvo cuando la factura
        // es la más vieja de todas y entra pegada al encabezado: ahí arriba está el
        // encabezado, y heredar de él le daría a la fila el formato de los títulos.
        inheritFromBefore: nextRow - 1 > headerRow,
      },
    }];
    // An inserted row inherits formatting but not formulas. Copy them column by
    // column — copying the whole row would drag the neighbouring invoice's values
    // along with them.
    // Se copian las que la fila de arriba tiene de verdad, no las de la columna: en
    // "Costo" la de arriba es un importe escrito a mano, y copiarla habría arrastrado
    // el monto de la factura anterior a la nueva fila.
    const heredables = ref.map((_, i) => i).filter((i) => esFormula(ref, i));
    // La fila modelo, en índices desde cero y ya contando el corrimiento: si entra
    // pegada al encabezado, la que era su vecina de abajo quedó una más abajo todavía.
    const srcIndex = desdeArriba ? nextRow - 2 : nextRow;
    for (const run of runsOf(heredables)) {
      requests.push({
        copyPaste: {
          source: { sheetId: tabGid, startRowIndex: srcIndex, endRowIndex: srcIndex + 1, startColumnIndex: run.start, endColumnIndex: run.end + 1 },
          destination: { sheetId: tabGid, startRowIndex: nextRow - 1, endRowIndex: nextRow, startColumnIndex: run.start, endColumnIndex: run.end + 1 },
          pasteType: 'PASTE_FORMULA',
        },
      });
    }
    const ins = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!ins.ok) {
      // Couldn't make room; land past the data rather than overwrite the last line
      // of the user's template.
      grewTemplate = false;
      nextRow = Math.max(used + headerRow, lastTemplate + 1, headerRow + 1);
      refRow = nextRow;
      ref = await rowCells(sheetId, tabName, refRow, accessToken);
    }
  }

  // Con la fila de destino a la vista se decide celda por celda. Una fórmula no se pisa
  // nunca, venga de donde venga la orden. Y una columna dada por calculada que en esta
  // fila está libre se escribe, que es el caso de "Costo": la planilla la suma abajo,
  // pero la línea de la factura la llena el usuario.
  const writtenIdx: number[] = [];
  for (let i = 0; i < row.length; i++) {
    if (esFormula(ref, i)) { row[i] = null; continue; }
    if (row[i] === null) {
      const t = tentative[i];
      // Si vamos a insertar, la fila nueva nace vacía. Si vamos a usar una fila que ya
      // está, sólo se ocupa la celda si no había nada escrito.
      const libre = grewTemplate || correrPrimera || String(ref[i] ?? '').trim() === '';
      if (t != null && t !== '' && libre) {
        row[i] = t;
      } else if (correrPrimera) {
        // Al correr la primera factura una fila para abajo, su contenido sigue estando
        // también en la fila que ahora es nuestra. Lo que no es fórmula y no llenamos
        // nosotros hay que borrarlo, o la factura nueva saldría con datos de la vieja.
        row[i] = '';
      }
    }
    if (row[i] !== null && row[i] !== '') writtenIdx.push(i);
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
    run.values.push(sanitizeCell(v));
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
  return { ok: true, status: r.status, targetRow: nextRow, grewTemplate, writtenIdx, ordenada: ordenFecha != null };
}

const FIELD_ALIASES: Record<string, string[]> = {
  proveedor: ['proveedor', 'empresa', 'supplier', 'vendedor', 'emisor', 'razon social', 'nombre', 'comercio', 'distribuidor'],
  rut: ['rut', 'cuit', 'nit', 'id fiscal', 'identificacion fiscal', 'ruc', 'rut proveedor', 'rut emisor'],
  fecha: ['fecha', 'fecha factura', 'fecha emision', 'fecha de emision', 'date', 'fecha comprobante'],
  // Sin la 'n' suelta: matcheaba con cualquier columna que tuviera una ene. "Neto"
  // contiene una, así que el número de factura terminaba escrito ahí. Una columna
  // llamada "N°" sigue enganchando, porque 'numero' la contiene.
  nroDocumento: ['numero', 'n factura', 'factura n', 'numero factura', 'nro factura', 'nro doc', 'nro comprobante', 'comprobante', 'serie', 'serie n', 'serie numero'],
  tipoDocumento: ['tipo', 'tipo documento', 'tipo comprobante', 'tipo de cfe', 'tipo cfe'],
  moneda: ['moneda', 'currency', 'divisa'],
  neto: ['neto', 'subtotal', 'base imponible', 'monto neto', 'base', 'subtotal tasa basica'],
  ivaTotal: ['iva', 'impuesto', 'tax', 'total iva', 'iva 22', 'iva22'],
  // 'costo' faltaba, y es como se llama la columna de importe en la mayoría de las
  // planillas de comercio que vimos: la factura entraba con número y fecha pero sin
  // el monto.
  total: ['total', 'costo', 'costos', 'monto', 'importe', 'precio', 'gasto', 'monto total', 'valor total', 'total factura', 'amount'],
};

// La puntuación se reemplaza por espacio y no se borra: "Serie/N°" tiene que quedar
// "serie n" y no "serien", que no coincide con nada.
function normStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Columns Ritto must never fill, whatever the model returns for them. A payment date
// simply is not in a CFE — the document only carries the issue date — and a monthly
// accumulator sums many invoices, so one invoice's amount does not belong there.
// The formula check already catches most of these; this covers the rest, e.g. the
// first export into a template whose =SUM() rows have not been written yet.
// Escribimos con USER_ENTERED, que es lo que hace que Sheets interprete fechas y
// montos como el usuario espera. El costo es que un texto que arranque con "=" se
// ejecuta como fórmula: una factura preparada con =IMPORTRANGE en la razón social
// terminaría corriendo dentro de la planilla del cliente. La comilla simple le dice
// a Sheets que trate la celda como texto y no se ve en la celda.
const FORMULA_START = /^[=+\-@\t\r]/;

function sanitizeCell(value: string | number): string | number {
  if (typeof value !== 'string') return value;
  return FORMULA_START.test(value.trim()) ? `'${value.trim()}` : value;
}

// Where a person would type the invoice amount by hand, best candidate first. A
// column called "Costo" beats one called "Total" because "Total" is just as often
// the sheet's own calculation.
const MONEY_COLUMN = ['costo', 'monto', 'importe', 'precio', 'valor', 'subtotal', 'total', 'neto'];

// El símbolo de moneda es la señal más clara de que una columna lleva plata, y era
// justo la que se perdía: normStr borra la puntuación, así que una columna llamada
// "$ xx" quedaba en "xx" y no coincidía con nada. Se mira el encabezado crudo.
const CURRENCY_HEADER = /\$|u\$s|€|\busd\b|\buyu\b|pesos/i;
// Salvo cuando la moneda es el tema de la columna y no su contenido.
const NOT_MONEY = /cotizacion|tipo de cambio|\bcambio\b|moneda/;

function hasCurrencySymbol(header: string): boolean {
  return CURRENCY_HEADER.test(header) && !NOT_MONEY.test(normStr(header));
}

function looksLikeMoney(header: string): boolean {
  if (hasCurrencySymbol(header)) return true;
  const h = normStr(header);
  return MONEY_COLUMN.some((k) => h.includes(k));
}

function bestMoneyColumn(headers: string[], usable: (h: string) => boolean): string | null {
  const open = headers.filter(usable);
  // Antes de cualquier palabra: si hay una columna con símbolo de moneda, es esa.
  const conSimbolo = open.find(hasCurrencySymbol);
  if (conSimbolo) return conSimbolo;
  for (const key of MONEY_COLUMN) {
    const exact = open.find((h) => normStr(h) === key);
    if (exact) return exact;
  }
  for (const key of MONEY_COLUMN) {
    const partial = open.find((h) => normStr(h).includes(key));
    if (partial) return partial;
  }
  return null;
}


// El matcher anterior comparaba subcadenas sueltas y se quedaba con el primer campo
// declarado que enganchara. Eso hacía que "Total" cayera en neto —porque "subtotal"
// contiene "total"— y que "RUT Emisor" cayera en proveedor, porque contiene "emisor".
// Ahora se puntúan todas las opciones y gana la más específica: coincidencia exacta
// primero, y después por palabra completa, valorando el sinónimo más largo.
function matchField(col: string): string | null {
  const n = normStr(col);
  if (!n) return null;

  // Un encabezado con símbolo de moneda es dinero aunque no diga ninguna palabra
  // conocida. Puntúa por debajo de un nombre explícito, para que "Total $" siga
  // ganando por "total" y no por el símbolo.
  let bestField: string | null = hasCurrencySymbol(col) ? 'total' : null;
  let bestScore = bestField ? 45 : 0;

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const raw of aliases) {
      const a = normStr(raw);
      if (!a) continue;
      let score = 0;
      if (n === a) score = 100 + a.length;
      else if (new RegExp(`\\b${a}\\b`).test(n)) score = 50 + a.length;
      else if (new RegExp(`\\b${n}\\b`).test(a)) score = 30 + n.length;
      if (score > bestScore) { bestScore = score; bestField = field; }
    }
  }
  return bestField;
}

// Mira las filas que ya están cargadas y devuelve qué columnas contienen dinero, y
// cuál de ellas maneja los importes más grandes. Es lo que hace un humano cuando abre
// una planilla ajena: no lee los títulos, mira los números.
//
// Existe porque los títulos no alcanzan. Una columna puede llamarse "Costo", "Imp.",
// "$" o algo que ninguna lista va a adivinar nunca, y aun así se reconoce por lo que
// tiene adentro.
function columnasConDinero(tabHeaders: string[], sampleRows: string[][]): { header: string; escala: number }[] {
  const encontradas: { header: string; escala: number }[] = [];

  for (let idx = 0; idx < tabHeaders.length; idx++) {
    let montos = 0;
    let suma = 0;
    for (const row of sampleRows) {
      const celda = row?.[idx];
      if (celda == null || String(celda).trim() === '') continue;
      const monto = parseAmount(String(celda));
      // Se exige decimales o separador de miles: si no, un año o una cantidad
      // pasarían por importe.
      if (monto != null && /[.,]/.test(String(celda))) {
        montos++;
        suma += Math.abs(monto);
      }
    }
    if (montos > 0) encontradas.push({ header: tabHeaders[idx], escala: suma / montos });
  }

  // De mayor a menor: el total de una factura es más grande que su IVA o su descuento.
  return encontradas.sort((a, b) => b.escala - a.escala);
}

function fallbackMapInvoice(
  inv: Record<string, unknown>,
  tabHeaders: string[],
  sampleRows: string[][] = [],
): Record<string, string | number | null> {
  const isNC = typeof inv.tipoDocumento === 'string' && /cr[eé]dito/i.test(inv.tipoDocumento);
  const NUMERIC_SIGN = new Set(['neto', 'iva10', 'iva22', 'ivaTotal', 'total']);
  const result: Record<string, string | number | null> = {};

  for (const col of tabHeaders) {
    const field = matchField(col);
    if (field) {
      const v = inv[field];
      if (v != null) {
        result[col] = typeof v === 'number' && isNC && NUMERIC_SIGN.has(field) ? -v : (typeof v === 'number' ? v : String(v));
      } else {
        result[col] = null;
      }
      continue;
    }
    result[col] = null;
  }

  // Si por el nombre no se ubicó dónde va la plata, se busca por el contenido: la
  // columna cuyos valores ya cargados parecen importes y maneja los más grandes.
  const yaTieneImporte = Object.entries(result).some(
    ([col, v]) => v != null && v !== '' && matchField(col) === 'total',
  );
  if (!yaTieneImporte && typeof inv.total === 'number') {
    const candidata = columnasConDinero(tabHeaders, sampleRows).find(
      (c) => !isProtectedHeader(c.header) && (result[c.header] == null || result[c.header] === ''),
    );
    if (candidata) {
      result[candidata.header] = isNC ? -Math.abs(inv.total) : inv.total;
    }
  }

  return result;
}

// Formas jurídicas y palabras de unión: nadie bautiza la pestaña "Loazzolo S.A.",
// le pone "Loazzolo". Comparar el nombre completo no engancha nunca.
const LEGAL_FORM = new Set([
  'sa', 'srl', 'sas', 'ltda', 'ltd', 'limitada', 'sociedad', 'anonima', 'saic', 'sca',
  'cia', 'compania', 'hnos', 'hermanos', 'e', 'y', 'de', 'del', 'la', 'el', 'los', 'las',
  'uy', 'uruguay', 'unipersonal',
]);

// Palabras de rubro: dos proveedores distintos las comparten, así que compartir SOLO
// una de estas no alcanza para decir que la pestaña es la de este proveedor.
const GENERIC_WORD = new Set([
  'distribuidora', 'distribuciones', 'distribucion', 'comercial', 'importadora',
  'exportadora', 'empresa', 'servicios', 'servicio', 'agencia', 'deposito', 'barraca',
  'supermercado', 'almacen', 'mercado', 'grupo', 'industrias', 'industria', 'productos',
  'casa', 'centro', 'tienda', 'ferreteria', 'farmacia',
]);

function significantTokens(name: string): string[] {
  return normStr(name).split(' ').filter((t) => t.length > 1 && !LEGAL_FORM.has(t));
}

// Puntúa cuánto se parecen. Tolera que falte la forma jurídica, los puntos y los
// acentos, y aguanta abreviaturas ("Multiv." para "MULTIVENTAS distribuciones").
function tabScore(tabName: string, providerName: string): number {
  const prov = significantTokens(providerName);
  const tab = significantTokens(tabName);
  if (prov.length === 0 || tab.length === 0) return 0;

  const provJoined = prov.join(' ');
  const tabJoined = tab.join(' ');
  if (provJoined === tabJoined) return 100;
  if (provJoined.includes(tabJoined) || tabJoined.includes(provJoined)) return 80;

  // Sin espacios, porque no siempre se separan igual: "MultiVentas" y "Multi Ventas".
  const provTight = provJoined.replace(/ /g, '');
  const tabTight = tabJoined.replace(/ /g, '');
  if (provTight === tabTight) return 95;
  if (tabTight.length >= 4 && (provTight.includes(tabTight) || tabTight.includes(provTight))) return 75;

  let best = 0;
  for (const a of prov) {
    for (const b of tab) {
      const generic = GENERIC_WORD.has(a) || GENERIC_WORD.has(b);
      if (a === b) best = Math.max(best, generic ? 30 : 60 + Math.min(a.length, 12));
      else if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) {
        best = Math.max(best, generic ? 25 : 40 + Math.min(a.length, b.length, 12));
      }
    }
  }
  return best;
}

// Devuelve la pestaña que mejor puntúa, o null si ninguna llega al mínimo. Que sea
// null es información para el usuario: su factura no tiene dónde ir.
function matchTabByProvider(tabs: string[], providerName: string): string | null {
  let bestTab: string | null = null;
  let bestScore = 0;
  for (const tab of tabs) {
    const score = tabScore(tab, providerName);
    if (score > bestScore) { bestScore = score; bestTab = tab; }
  }
  return bestScore >= 40 ? bestTab : null;
}

function findBestTab(tabs: string[], providerName?: string): string {
  if (providerName) {
    const matched = matchTabByProvider(tabs, providerName);
    if (matched) return matched;
  }
  const gastoKeywords = ['gasto', 'proveedor', 'compra', 'egreso', 'costo', 'factura'];
  for (const tab of tabs) {
    const nt = normStr(tab);
    if (gastoKeywords.some((k) => nt.includes(k))) return tab;
  }
  return tabs[0];
}

const FALLBACK_TAB = 'Ritto - Sin clasificar';

// Con qué identificamos a un proveedor entre exportaciones. El RUT primero porque no
// cambia; el nombre como respaldo, porque en una foto borrosa el RUT puede no leerse.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'No autorizado' });

    const { invoices, pestanasElegidas } = req.body as {
      invoices: Record<string, unknown>[];
      // El usuario eligió a mano a qué pestaña va cada proveedor que no encontramos.
      pestanasElegidas?: Record<string, string>;
      // Columnas que el usuario autorizó a escribir aunque tengan fórmulas. Es su
      // planilla y su decisión: Ritto avisa, no impone.
      forzarColumnas?: string[];
    };
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

    if (!profile?.google_access_token) return res.status(403).json({ error: 'Todavía no conectaste tu cuenta de Google.' });
    if (!profile.google_sheet_id) return res.status(400).json({ error: 'Falta el link de tu planilla de Google Sheets.' });

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
    const { tabs: existingTabs, tabHeaderMap, tabWritableHeaders, tabSampleRows, tabGidMap, tabHeaderRow } = await fetchSheetStructure(sheetId, accessToken);

    if (!existingTabs.length) {
      return res.status(400).json({ error: 'No se pudieron obtener las pestañas de la planilla. Revisá la URL y los permisos.' });
    }

    let totalRows = 0;
    const writtenTabs: string[] = [];
    const exportedIds: string[] = [];
    const sinPestana: string[] = [];
    const sinPestanaDetalle: Array<{ proveedor: string; claves: string[]; guardadas: string[] }> = [];
    // Proveedores cuya pestaña quedó aprendida en esta exportación.
    const aprendidos: string[] = [];
    const sinImporte: Array<{ factura: string; motivo: string; importe: number | null; pestana: string; descartadas: Array<{ columna: string; motivo: string }>; notas: string[] }> = [];

    // El mismo comprobante, subido dos veces, son dos filas distintas en la base: la
    // segunda no tiene fecha de exportación, así que el control del navegador la deja
    // pasar y la planilla del cliente termina con la factura repetida. Acá se compara
    // contra lo que ya se exportó alguna vez, por número de comprobante y emisor, que es
    // lo que identifica a una factura sin importar cuántas veces se haya subido el
    // archivo.
    const identidad = (nro: unknown, rut: unknown, prov: unknown): string | null => {
      const n = typeof nro === 'string' ? nro.trim() : '';
      if (!n) return null;   // sin número no hay con qué identificarla
      const emisor = typeof rut === 'string' && rut.replace(/\D/g, '').length >= 8
        ? rut.replace(/\D/g, '')
        : typeof prov === 'string' ? normStr(prov) : '';
      return `${emisor}|${normStr(n)}`;
    };

    const numerosBuscados = invoices
      .map((i) => (typeof i.nroDocumento === 'string' ? i.nroDocumento.trim() : ''))
      .filter(Boolean);

    const yaEnLaPlanilla = new Map<string, string>();   // identidad → id de la factura original
    if (numerosBuscados.length > 0) {
      const { data: previas } = await supabase
        .from('invoices')
        .select('id, nro_documento, rut, proveedor')
        .eq('user_id', user.id)
        .not('exported_at', 'is', null)
        .in('nro_documento', numerosBuscados);
      for (const prev of previas ?? []) {
        const clave = identidad(prev.nro_documento, prev.rut, prev.proveedor);
        if (clave && !yaEnLaPlanilla.has(clave)) yaEnLaPlanilla.set(clave, prev.id as string);
      }
    }

    // Las que el usuario decidió mandar igual, sabiendo que ya estaban.
    const forzarDuplicadas = new Set(
      ((req.body as { forzarDuplicadas?: string[] }).forzarDuplicadas ?? []).filter((x) => typeof x === 'string'),
    );
    const duplicadas: Array<{ id: string; factura: string }> = [];

    // Reglas que el usuario ya enseñó en exportaciones anteriores.
    const { data: reglas, error: reglasErr } = await supabase
      .from('vendor_mappings')
      .select('vendor_key, sheet_name')
      .eq('user_id', user.id);

    // Si la memoria no funciona hay que decirlo. Antes fallaba en silencio: el usuario
    // elegía la pestaña, apretaba "enviar y recordar", la exportación salía bien y a la
    // factura siguiente Ritto se lo volvía a preguntar, sin ninguna señal de por qué.
    let memoriaError: string | null = reglasErr ? reglasErr.message : null;

    // Autorizaciones guardadas de exportaciones anteriores.
    const columnasAutorizadas = new Set<string>();
    for (const r of reglas ?? []) {
      const k = String(r.vendor_key ?? '');
      if (k.startsWith('columna:')) columnasAutorizadas.add(k.slice('columna:'.length));
    }
    for (const c of (req.body as { forzarColumnas?: string[] }).forzarColumnas ?? []) {
      if (typeof c === 'string' && c.trim()) columnasAutorizadas.add(normStr(c));
    }

    const aprendidas: Record<string, string> = {};
    for (const r of reglas ?? []) {
      // Si la pestaña se renombró o se borró, la regla ya no sirve.
      if (existingTabs.includes(r.sheet_name as string)) {
        aprendidas[r.vendor_key as string] = r.sheet_name as string;
      }
    }

    // Sólo se aceptan pestañas que existan de verdad: el nombre viene del cliente.
    const elegidas: Record<string, string> = {};
    for (const [prov, tab] of Object.entries(pestanasElegidas ?? {})) {
      const real = existingTabs.find((t) => t === tab) ?? resolveTab(String(tab), existingTabs);
      if (real && prov.trim()) elegidas[normStr(prov)] = real;
    }

    // Para el prompt hace falta la asignación por nombre de proveedor, que es como el
    // modelo ve las facturas.
    const forzadasParaPrompt: Record<string, string> = {};
    for (const inv of invoices) {
      const prov = typeof inv.proveedor === 'string' ? inv.proveedor.trim() : '';
      if (!prov) continue;
      const elegida = elegidas[normStr(prov)];
      const destino = elegida ?? reglaAprendida(inv, aprendidas)?.pestana;
      if (destino) forzadasParaPrompt[prov] = destino;
    }

    // El modelo ve TODAS las columnas, no sólo las que la lectura de columna entera dio
    // por libres. Ocultarle "Costo" porque la planilla la suma abajo era la razón de
    // fondo por la que el importe no entraba: no es que Ritto se negara a escribirlo,
    // es que nunca le había ofrecido esa columna como destino. Lo que no se puede pisar
    // lo decide la celda concreta, más adelante, con las fórmulas a la vista.
    const tabColumnasParaPrompt: Record<string, string[]> = {};
    for (const [tab, headers] of Object.entries(tabHeaderMap)) {
      const visibles = headers.filter((h) => !isGhost(h));
      if (visibles.length > 0) tabColumnasParaPrompt[tab] = visibles;
    }

    const geminiResult = await mapWithGemini(invoices, tabColumnasParaPrompt, tabSampleRows, forzadasParaPrompt);
    const geminiMappings = geminiResult.mappings;
    const useGemini = geminiMappings && geminiMappings.length === invoices.length;

    const invoiceDebug: Array<{
      index: number;
      resolvedTab: string;
      headersCount: number;
      rowAttempted: boolean;
      appendStatus: number | null;
      appendError: string | null;
      // Con qué claves se buscó la regla del proveedor y si enganchó. Sin esto, cuando
      // Ritto vuelve a preguntar una pestaña que el usuario ya había elegido no hay
      // forma de saber si el problema es que no se guardó o que la factura llegó con
      // otro nombre y otro RUT.
      claves: string[];
      reglaHit: string | null;
      // Por qué columna se ordenó la pestaña, y si la pestaña resultó estar ordenada.
      ordenPor?: string | null;
      ordenada?: boolean;
    }> = [];

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];

      let tabName: string;
      let datosFila: Record<string, string | number | null>;

      // Se calcula aparte de la elección de pestaña: no cambia dónde se escribe, sirve
      // para poder avisar cuando el proveedor no tiene pestaña propia en la planilla.
      const proveedorFactura = typeof inv.proveedor === 'string' ? inv.proveedor.trim() : '';

      let tieneSuPestana = proveedorFactura
        ? matchTabByProvider(existingTabs, proveedorFactura) !== null
        : true;

      if (useGemini) {
        const gm = geminiMappings.find((m) => m.index === i) ?? geminiMappings[i];
        const geminiTab = gm?.pestana_destino ?? '';
        tabName = (geminiTab && resolveTab(geminiTab, existingTabs)) || findBestTab(existingTabs) || FALLBACK_TAB;
        datosFila = gm?.datos_fila ?? {};
        // El modelo ve la planilla completa y reconoce abreviaturas que la comparación
        // de texto no engancha, así que su respuesta manda cuando dice que sí.
        if (gm?.es_pestana_del_proveedor === true) tieneSuPestana = true;
        else if (gm?.es_pestana_del_proveedor === false) tieneSuPestana = false;
      } else {
        const provider = typeof inv.proveedor === 'string' ? inv.proveedor : undefined;
        tabName = findBestTab(existingTabs, provider) || FALLBACK_TAB;
        const tabHeaders = tabHeaderMap[tabName];
        datosFila = tabHeaders ? fallbackMapInvoice(inv, tabHeaders, tabSampleRows[tabName] ?? []) : {};
      }

      // Precedencia: lo que el usuario elige ahora, después lo que enseñó antes, y
      // recién al final lo que dedujo el sistema.
      const elegida = proveedorFactura ? elegidas[normStr(proveedorFactura)] : undefined;
      const regla = reglaAprendida(inv, aprendidas);
      const destinoFijado = elegida ?? regla?.pestana;
      if (destinoFijado) {
        tabName = destinoFijado;
        tieneSuPestana = true;
      }

      if (!tabHeaderMap[tabName] && existingTabs.includes(tabName)) {
        const result = await fetchTabHeaders(sheetId, tabName, accessToken);
        if (result) {
          tabHeaderMap[tabName] = result.headers;
          tabWritableHeaders[tabName] = result.writableHeaders;
          tabHeaderRow[tabName] = result.headerRow;
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
        claves: vendorKeys(inv),
        reglaHit: regla ? `${regla.pestana}${regla.exacta ? '' : ' (por parecido)'}` : null,
      };

      const claveFactura = identidad(inv.nroDocumento, inv.rut, inv.proveedor);
      const idFactura = typeof inv.id === 'string' ? inv.id : '';
      const yaEstaba = claveFactura ? yaEnLaPlanilla.get(claveFactura) : undefined;
      // Se salta cuando el comprobante ya entró desde otra subida del mismo archivo. Si
      // es la misma fila de siempre, no hay nada que avisar: el control del navegador ya
      // se ocupa de esa.
      if (yaEstaba && yaEstaba !== idFactura && !forzarDuplicadas.has(idFactura)) {
        duplicadas.push({
          id: idFactura,
          factura: typeof inv.nroDocumento === 'string' ? inv.nroDocumento : '—',
        });
        debugEntry.appendError = 'ya_exportada';
        invoiceDebug.push(debugEntry);
        continue;
      }

      if (!tabHeaders || tabHeaders.length === 0) {
        invoiceDebug.push(debugEntry);
        continue;
      }

      // Sin pestaña del proveedor no se escribe. Antes la factura caía en una pestaña
      // general, que no es donde el usuario la busca, y quedaba marcada como exportada
      // igual. Se la deja sin exportar para que pueda reintentar después de arreglar el
      // nombre en la planilla. La excepción es una planilla de una sola pestaña: ahí no
      // hay ninguna decisión que tomar y ese es el destino.
      // Si el proveedor no tiene pestaña, se pregunta. Antes había una excepción: si
      // ninguna factura del lote encontraba la suya, se asumía que la planilla no
      // estaba organizada por proveedor y se escribía igual en una pestaña general.
      // Esa excepción existía porque preguntar era un callejón sin salida. Ahora que
      // el aviso deja elegir la pestaña y la recuerda, adivinar es siempre peor: la
      // factura terminaba en Resumen y el usuario se enteraba después.
      if (proveedorFactura && !tieneSuPestana && existingTabs.length > 1) {
        if (!sinPestana.includes(proveedorFactura)) sinPestana.push(proveedorFactura);
        // Con qué buscó y qué tenía guardado. Si Ritto vuelve a preguntar una pestaña que
        // el usuario ya eligió, esto es lo que distingue "no se guardó la regla" de "la
        // factura llegó con otro nombre o sin RUT" — y hasta ahora había que ir a mirar
        // la respuesta en el navegador para saberlo.
        if (!sinPestanaDetalle.some((d) => d.proveedor === proveedorFactura)) {
          sinPestanaDetalle.push({
            proveedor: proveedorFactura,
            claves: vendorKeys(inv),
            guardadas: Object.keys(aprendidas),
          });
        }
        debugEntry.appendError = 'sin_pestana_del_proveedor';
        invoiceDebug.push(debugEntry);
        continue;
      }

      await ensureTab(sheetId, tabName, accessToken, existingTabs);

      // El modelo mapea las columnas de la pestaña que él eligió. Si el usuario mandó
      // la factura a otra, esos nombres no existen acá y la fila saldría toda vacía.
      // Se detecta comparando contra los encabezados reales y, si no coincide ninguno,
      // se rearma con el mapeo por sinónimos.
      const encabezadosNorm = new Set(tabHeaders.map(normStr));
      const mapeaEstaPestana = Object.keys(datosFila).some((col) => encabezadosNorm.has(normStr(col)));
      if (!mapeaEstaPestana) {
        datosFila = fallbackMapInvoice(inv, tabHeaders, tabSampleRows[tabName] ?? []);
      }

      // One cell per header, in header order — never a concatenation, so a value can
      // never slide into the neighbouring column. Cells Ritto does not own become
      // null and are left untouched rather than blanked.
      const writable = new Set(tabWritableHeaders[tabName] ?? tabHeaders);
      const autorizada = (h: string) => columnasAutorizadas.has(normStr(h));
      // Autorizada por el usuario: se escribe aunque tenga fórmula. Pisarla es
      // exactamente lo que pidió.
      for (const h of tabHeaders) if (autorizada(h)) writable.add(h);

      // Dropping a value assigned to a protected column is not enough: if the model
      // decided the amount belonged in "TOTAL MES", refusing to write it there leaves
      // the invoice on the sheet with no money in it at all. Move that amount to the
      // column the user actually types into, and if it never came through, fall back
      // to the total Ritto read off the document itself.
      // El modelo devuelve las columnas por nombre, y ese nombre puede volver con otra
      // caja, un espacio de más o el símbolo escrito distinto. Buscarlo por igualdad
      // exacta hacía que el dato existiera y no se escribiera, sin ningún error a la
      // vista: la celda quedaba vacía y parecía que el modelo no lo había mapeado.
      const porNombre = new Map<string, string | number | null>();
      for (const [clave, valor] of Object.entries(datosFila)) {
        const k = normStr(clave);
        const actual = porNombre.get(k);
        if (actual == null || actual === '') porNombre.set(k, valor);
      }
      const valorDe = (col: string) => porNombre.get(normStr(col));

      // Para decidir a qué columna rescatar un importe alcanza con que el usuario sea el
      // dueño de esa columna. Tener fórmulas ya no la descarta acá: eso se resuelve
      // mirando la celda de destino, y si resultara ocupada el dato no entra igual.
      const usable = (h: string) => autorizada(h) || !isProtectedHeader(h);
      const moneyCol = bestMoneyColumn(tabHeaders, usable);
      // Only step in when no money column got a value at all. A sheet with both
      // "Subtotal" and "Total" fills one of them legitimately, and rescuing into the
      // other would write the amount twice.
      const anyMoneyFilled = tabHeaders.some(
        (h) => usable(h) && looksLikeMoney(h) && valorDe(h) != null && valorDe(h) !== '',
      );
      if (moneyCol && !anyMoneyFilled) {
        let rescued: number | null = null;
        for (const h of tabHeaders) {
          if (usable(h)) continue;
          const v = valorDe(h);
          if (v == null || v === '') continue;
          const amount = typeof v === 'number' ? v : parseAmount(String(v));
          if (amount != null) { rescued = amount; break; }
        }
        if (rescued == null && typeof inv.total === 'number') {
          const isNC = typeof inv.tipoDocumento === 'string' && /cr[eé]dito/i.test(inv.tipoDocumento);
          rescued = isNC ? -Math.abs(inv.total) : inv.total;
        }
        if (rescued != null) porNombre.set(normStr(moneyCol), rescued);
      }

      // Lo que cada columna contiene de verdad, segun las filas ya cargadas.
      const perfil = profileColumns(tabHeaders, tabSampleRows[tabName] ?? []);
      const rechazados: string[] = [];

      // Lo que le toca a una columna, ya convertido y verificado, o '' si no hay nada
      // que escribir ahí.
      const valorLimpio = (col: string): string | number => {
        const val = valorDe(col);
        if (val == null) return '';
        const limpio = typeof val === 'number' ? val : (parseAmount(val) ?? val);
        if (limpio === '') return '';

        // Última barrera antes de escribir: si el dato no se parece a lo que esa
        // columna viene conteniendo, no entra. Es lo que evita que una fecha termine
        // en una columna de importes y que el error se descubra abriendo la planilla.
        if (!fitsColumn(limpio, perfil[col])) {
          rechazados.push(`«${limpio}» no entró en «${col}», que contiene ${perfil[col] === 'fecha' ? 'fechas' : perfil[col] === 'texto' ? 'texto' : 'números'}`);
          return '';
        }
        return limpio;
      };

      const row: (string | number | null)[] = tabHeaders.map((col) =>
        !writable.has(col) || (isProtectedHeader(col) && !autorizada(col)) ? null : valorLimpio(col),
      );

      // Una columna con fórmulas ya no se descarta acá. Se lleva como candidata y se
      // decide contra la celda real de la fila de destino: si esa celda está libre, el
      // dato entra. Las protegidas por nombre —"Total del mes", "Saldo"— sí quedan
      // afuera, porque ahí el cálculo es del usuario aunque la celda esté vacía.
      const tentativo: (string | number | null)[] = tabHeaders.map((col, i) =>
        row[i] === null && !isProtectedHeader(col) ? valorLimpio(col) : null,
      );

      // Don't write a row where every cell is empty (fallback had no alias matches)
      const hasData = row.some((v) => v !== '' && v != null) || tentativo.some((v) => v !== '' && v != null);
      if (!hasData) {
        debugEntry.appendError = 'skipped_empty_row';
        invoiceDebug.push(debugEntry);
        continue;
      }

      debugEntry.rowAttempted = true;
      const formulaIdx = tabHeaders.map((h, i) => (writable.has(h) ? -1 : i)).filter((i) => i >= 0);

      // Por dónde ordenar: la columna que contiene fechas —según lo que la pestaña ya
      // tiene cargado, no según cómo se llame— y en la que Ritto está escribiendo una.
      // Se compara el valor que va a escribir contra los que ya están, que es la única
      // forma de que el orden sea el de los comprobantes y no el de subida.
      // Primero la columna que la pestaña viene usando para fechas. Si el perfil no la
      // reconoció —pasa cuando las filas de ejemplo están vacías— vale cualquier columna
      // donde Ritto esté escribiendo algo que sea una fecha: para llegar hasta acá ese
      // valor ya pasó por fitsColumn, así que no va a ser una fecha metida en una
      // columna de importes. Sin este segundo intento, la pestaña no se ordenaba y no
      // había forma de notarlo desde afuera.
      let orden: { colIdx: number; fecha: number } | null = null;
      for (let i = 0; i < tabHeaders.length && !orden; i++) {
        if (perfil[tabHeaders[i]] !== 'fecha') continue;
        const f = fechaComparable(row[i]);
        if (f != null) orden = { colIdx: i, fecha: f };
      }
      for (let i = 0; i < tabHeaders.length && !orden; i++) {
        if (isProtectedHeader(tabHeaders[i])) continue;
        const f = fechaComparable(row[i]);
        if (f != null) orden = { colIdx: i, fecha: f };
      }
      debugEntry.ordenPor = orden ? tabHeaders[orden.colIdx] : null;

      const result = await appendRow(sheetId, tabName, row, accessToken, tabGidMap[tabName], formulaIdx, tabHeaderRow[tabName] ?? 1, tentativo, orden);
      debugEntry.appendStatus = result.status;
      debugEntry.appendError = result.error ?? null;
      debugEntry.ordenada = result.ordenada ?? false;

      // El aviso se arma después de escribir, no antes: hasta que no se mira la celda
      // de destino no se sabe si el importe entró. Calcularlo antes avisaba "sin
      // importe" en facturas que sí lo habían recibido.
      if (result.ok) {
        const escritas = new Set(result.writtenIdx ?? []);
        const importeEscrito = tabHeaders.some(
          (h, i) => looksLikeMoney(h) && !isProtectedHeader(h) && escritas.has(i) && typeof row[i] === 'number' && row[i] !== 0,
        );
        if (!importeEscrito) {
          const leido = typeof inv.total === 'number' && inv.total !== 0;
          // Qué columnas de dinero había y por qué no se uso ninguna. Sin esto el aviso
          // dice "no encontramos donde escribirlo" y no hay forma de saber si es que no
          // existe la columna o que Ritto la considera calculada.
          const descartadas = tabHeaders
            .map((h, i) => ({ h, i }))
            .filter(({ h, i }) => looksLikeMoney(h) && !escritas.has(i))
            .map(({ h }) => {
              if (isProtectedHeader(h)) return { columna: h, motivo: 'protegida' as const };
              if (!writable.has(h)) return { columna: h, motivo: 'formula' as const };
              return null;
            })
            .filter((x): x is { columna: string; motivo: 'formula' | 'protegida' } => x !== null);
          sinImporte.push({
            factura: typeof inv.nroDocumento === 'string' ? inv.nroDocumento : (typeof inv.fileName === 'string' ? inv.fileName : '—'),
            // Distinguir las dos causas es lo que decide qué hacer: releer el
            // comprobante, o revisar la planilla.
            motivo: leido ? 'sin_columna' : 'no_se_leyo',
            importe: leido ? (inv.total as number) : null,
            pestana: tabName,
            descartadas,
            notas: rechazados,
          });
        }

        // Una factura en dólares escrita entre importes en pesos no se distingue de
        // ninguna manera: el número queda plausible y el total del mes da cualquier
        // cosa. Si la pestaña no tiene dónde anotar la moneda, hay que avisar.
        const moneda = typeof inv.moneda === 'string' ? inv.moneda.trim().toUpperCase() : '';
        const monedaEscrita = tabHeaders.some(
          (h, i) => escritas.has(i) && /\b(moneda|divisa|currency)\b/.test(normStr(h)),
        );
        if (moneda && moneda !== 'UYU' && !monedaEscrita) {
          sinImporte.push({
            factura: typeof inv.nroDocumento === 'string' ? inv.nroDocumento : '—',
            motivo: 'moneda',
            importe: typeof inv.total === 'number' ? inv.total : null,
            pestana: tabName,
            descartadas: [],
            notas: [moneda],
          });
        }

        if (importeEscrito && rechazados.length > 0) {
          sinImporte.push({
            factura: typeof inv.nroDocumento === 'string' ? inv.nroDocumento : '—',
            motivo: 'dato_rechazado',
            importe: null,
            pestana: tabName,
            descartadas: [],
            notas: rechazados,
          });
        }
      }

      if (result.ok) {
        totalRows++;
        if (!writtenTabs.includes(tabName)) writtenTabs.push(tabName);
        if (typeof inv.id === 'string') exportedIds.push(inv.id);

        // Recién se aprende después de escribir bien: si la exportación falla, no
        // queremos dejar una regla apuntando a una pestaña que no funcionó.
        for (const col of tabHeaders) {
          if (!autorizada(col)) continue;
          const { error: autErr } = await supabase.from('vendor_mappings').upsert({
            user_id: user.id,
            vendor_key: `columna:${normStr(col)}`,
            vendor_name: col,
            sheet_name: tabName,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,vendor_key' });
          if (autErr) memoriaError = memoriaError ?? autErr.message;
        }

        // Se guarda cuando el usuario eligió la pestaña, y también cuando la regla
        // enganchó por parecido de nombre: así la próxima factura la encuentra por
        // clave exacta y la memoria se afirma sola en vez de depender del parecido.
        if (elegida || (regla && !regla.exacta)) {
          const filas = vendorKeys(inv).map((vendor_key) => ({
            user_id: user.id,
            vendor_key,
            vendor_name: proveedorFactura || null,
            sheet_name: tabName,
            updated_at: new Date().toISOString(),
          }));
          if (filas.length > 0) {
            const { error: reglaErr } = await supabase
              .from('vendor_mappings')
              .upsert(filas, { onConflict: 'user_id,vendor_key' });
            if (reglaErr) {
              console.error('[append] no se pudo guardar la regla:', reglaErr.message);
              memoriaError = memoriaError ?? reglaErr.message;
            } else if (!aprendidos.includes(proveedorFactura)) aprendidos.push(proveedorFactura);
          }
        }
      }
      invoiceDebug.push(debugEntry);
    }

    // Marcar como exportadas acá y no desde el navegador: el cliente escribía con la
    // sesión del usuario y, si la política de la tabla rechazaba el update, fallaba en
    // silencio. La factura se veía archivada hasta que refrescabas y volvía a aparecer.
    let exportedAt: string | null = null;
    let marcadoError: string | null = null;
    if (exportedIds.length > 0) {
      const stamp = new Date().toISOString();
      const { error: markError } = await supabase
        .from('invoices')
        .update({ exported_at: stamp })
        .eq('user_id', user.id)
        .in('id', exportedIds);
      if (markError) {
        // Esto tiene que verse. Mientras fallaba callado, la factura no salía nunca de
        // la lista y cada clic en exportar escribía otra fila igual en la planilla del
        // cliente: ocho clics, ocho filas repetidas, y nadie con motivo para sospechar
        // que el problema era una marca que no se guardaba.
        console.error('[append] no se pudieron marcar como exportadas:', markError.message);
        marcadoError = markError.message;
        void logError('sheets/append:marcar', markError, {
          userId: user.id,
          contexto: { facturas: exportedIds.length },
        });
      } else {
        exportedAt = stamp;
      }
    }

    const primaryTab = writtenTabs[0];
    const primaryGid = primaryTab != null ? tabGidMap[primaryTab] : undefined;
    const baseSheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    const redirectUrl = primaryGid != null ? `${baseSheetUrl}#gid=${primaryGid}` : baseSheetUrl;

    return res.status(200).json({
      ok: totalRows > 0,
      rowsAdded: totalRows,
      sinPestana,
      sinPestanaDetalle,
      duplicadas,
      aprendidos,
      memoriaError,
      sinImporte,
      // Las pestañas que realmente tiene la planilla. Van al cliente para que, cuando
      // una factura no encuentre la suya, la pantalla pueda mostrar las que hay: sin
      // eso el usuario lee "creá una pestaña" y no tiene con qué comparar.
      pestanasDisponibles: existingTabs,
      exportedIds,
      exportedAt,
      marcadoError,
      tabs: writtenTabs,
      updatedRange: writtenTabs.join(', '),
      // Siempre, no sólo cuando se escribió algo. El link es útil igual —el usuario
      // quiere ir a mirar— y hacerlo depender de rowsAdded era la razón por la que,
      // después de elegir la pestaña a mano, había que exportar dos veces para que
      // apareciera el acceso a la planilla.
      redirectUrl,
      engine: useGemini ? 'gemini' : 'fallback',
      _debug: {
        existingTabs,
        tabsWithHeaders: Object.keys(tabHeaderMap),
        geminiCalled: geminiResult.called,
        geminiReason: geminiResult.reason ?? null,
        geminiMappings: useGemini ? geminiMappings : null,
        reglasGuardadas: Object.keys(aprendidas),
        invoices: invoiceDebug,
      },
    });
  } catch (err) {
    // Sin await: el usuario no tiene que esperar a que se registre el error.
    void logError('sheets/append', err, {
      contexto: { facturas: Array.isArray(req.body?.invoices) ? req.body.invoices.length : null },
    });
    return res.status(500).json({ error: 'Error interno al exportar. Intentá de nuevo o escribinos por WhatsApp al 093403706' });
  }
}
