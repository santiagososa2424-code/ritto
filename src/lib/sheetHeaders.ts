// Cómo Ritto lee el encabezado de una pestaña.
//
// Vive acá y no en el endpoint porque de esto depende todo lo demás: si se equivoca de
// fila de encabezado, cada columna queda con el nombre de otra y la factura entera se
// escribe corrida. Es el supuesto más fuerte que hace el sistema y por eso es el que
// más falta que se pueda probar contra planillas de formas distintas.

import { normStr } from './sheetProfile.ts';

// Una columna sin título no se puede descartar: si se la saca de la lista, todas las
// que vienen después se corren un lugar y la fila entera queda desalineada. Se le pone
// un nombre interno para que ocupe su casillero, y como no entra en las escribibles,
// nunca se le escribe nada.
export const GHOST_COLUMN = '__ritto_col_';
export const isGhost = (h: string) => h.startsWith(GHOST_COLUMN);

export const HEADER_HINT = /fecha|rut|monto|total|proveedor|factura|costo|comprobante|importe|neto|iva|serie|documento|precio|cliente|empresa|descripcion/;

// Mucha gente arranca la planilla con un título o un logo y recién pone los
// encabezados en la fila 3 o 4. Leyendo siempre la fila 1 se tomaba esa decoración
// como nombres de columna. Se busca entre las primeras filas la que más se parece a
// un encabezado: por palabras típicas de una planilla contable y, si no hay ninguna
// —porque el usuario les puso nombres propios—, por cantidad de celdas con texto.
export function findHeaderRow(rows: string[][]): number {
  let bestRow = 1;
  let bestScore = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] ?? []).map((c) => (c == null ? '' : String(c).trim()));
    const filled = cells.filter(Boolean).length;
    if (filled < 2) continue;
    const hints = cells.filter((c) => HEADER_HINT.test(normStr(c))).length;
    const score = filled + hints * 3;
    if (score > bestScore) { bestScore = score; bestRow = i + 1; }
  }
  return bestRow;
}

export function namedHeaders(raw: string[]): string[] {
  return raw.map((h, i) => {
    const text = h == null ? '' : String(h).trim();
    return text || `${GHOST_COLUMN}${i}`;
  });
}

// La detección miraba una sola fila. Si esa estaba vacía y las fórmulas empezaban más
// abajo, la columna pasaba por escribible y se pisaba el cálculo del usuario.
export function formulaColumns(headers: string[], formulaRows: string[][]): Set<string> {
  const found = new Set<string>();
  for (const row of formulaRows) {
    for (let idx = 0; idx < headers.length; idx++) {
      const cell = row?.[idx];
      if (typeof cell === 'string' && cell.startsWith('=')) found.add(headers[idx]);
    }
  }
  return found;
}

