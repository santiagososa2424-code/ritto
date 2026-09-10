import { parseAmount } from './money';

// ---------------------------------------------------------------------------
// Perfil de columnas
//
// Hasta acá el destino de cada dato se decidia por el nombre del encabezado: listas
// de sinonimos, simbolos de moneda, expresiones regulares. Cada regla nueva arreglaba
// un caso y rompia otro, porque el nombre de una columna no dice de que es.
//
// Los datos que el usuario ya cargo si lo dicen. Una columna con fechas es de fechas,
// aunque se llame "F." o "Vto". Una con importes es de plata, aunque se llame "$ xx".
// Esto perfila cada columna con sus propios valores y despues se usa para verificar
// la fila ANTES de escribirla: si un dato no encaja con lo que esa columna contiene,
// no se escribe y se avisa, en vez de ensuciar la planilla en silencio.
// ---------------------------------------------------------------------------

export type ColumnKind = 'fecha' | 'dinero' | 'numero' | 'texto' | 'vacia';

const LOOKS_DATE = /^\s*\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}\s*$/;

function kindOfValue(raw: string): ColumnKind | null {
  const v = raw.trim();
  if (!v) return null;
  if (LOOKS_DATE.test(v)) return 'fecha';
  const n = parseAmount(v);
  if (n != null) {
    // Con separador decimal o símbolo de moneda es plata; sin eso puede ser una
    // cantidad, un año o un número de algo.
    return /[.,]/.test(v) || /\$|u\$s|€/i.test(v) ? 'dinero' : 'numero';
  }
  return 'texto';
}

export function profileColumns(headers: string[], sampleRows: string[][]): Record<string, ColumnKind> {
  const perfil: Record<string, ColumnKind> = {};

  for (let idx = 0; idx < headers.length; idx++) {
    const conteo: Record<string, number> = {};
    let total = 0;
    for (const row of sampleRows) {
      const k = kindOfValue(String(row?.[idx] ?? ''));
      if (!k) continue;
      conteo[k] = (conteo[k] ?? 0) + 1;
      total++;
    }
    if (total === 0) { perfil[headers[idx]] = 'vacia'; continue; }

    let mejor: ColumnKind = 'texto';
    let mejorN = 0;
    for (const [k, n] of Object.entries(conteo)) {
      if (n > mejorN) { mejorN = n; mejor = k as ColumnKind; }
    }
    // Una sola fila distinta no cambia el tipo de la columna.
    perfil[headers[idx]] = mejorN / total >= 0.6 ? mejor : 'texto';
  }
  return perfil;
}

// ¿Este valor tiene sentido en una columna de este tipo? Sobre una columna sin datos
// no hay evidencia, así que se deja pasar: negarse ahí seria peor que arriesgar.
export function fitsColumn(value: string | number, kind: ColumnKind): boolean {
  if (kind === 'vacia' || kind === 'texto') return true;
  const asText = String(value).trim();
  if (!asText) return true;
  const k = kindOfValue(asText);
  if (k === null) return true;
  if (kind === 'fecha') return k === 'fecha';
  if (kind === 'dinero' || kind === 'numero') return k === 'dinero' || k === 'numero';
  return true;
}
