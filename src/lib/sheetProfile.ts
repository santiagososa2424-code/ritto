import { parseAmount } from './money';

// La puntuación se reemplaza por espacio y no se borra: "Serie/N°" tiene que quedar
// "serie n" y no "serien", que no coincide con nada.
export function normStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

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

// La deuda, el saldo y el estado de pago no están en la factura: dependen de si el
// cliente pagó, que es información de la empresa y no del comprobante. En casi todas
// las planillas son columnas calculadas. Escribirlas rompe la fórmula que las calcula,
// y como la detección de fórmulas mira las filas de abajo, una vez pisadas ya no se
// detectan y el daño se repite en cada exportación.
export const PROTECTED_HEADER = /(fecha|dia)\s*(de\s*)?(pago|cobro)|(total|subtotal)\s*(del\s*)?(mes|ano|anual|general)\b|acumulad|\bsuma(s|toria)?\b|\bsaldo\b|\bdiferencia\b|\bdeuda\b|\bpendiente\b|\bdebe\b|estado\s*(de\s*)?(pago|pedido)/;

export function isProtectedHeader(header: string): boolean {
  return PROTECTED_HEADER.test(normStr(header));
}

// Escribimos con USER_ENTERED, que es lo que hace que Sheets interprete fechas y
// montos como el usuario espera. El costo es que un texto que arranque con "=" se
// ejecuta como fórmula: una factura preparada con =IMPORTRANGE o =HYPERLINK en la
// razón social terminaría corriendo dentro de la planilla del cliente. La comilla
// simple le dice a Sheets que trate la celda como texto y no se ve en la celda.
// Sólo aplica a texto: los importes ya vienen convertidos a número, así que un
// negativo como -2840 no se toca y sigue sumando.
const FORMULA_START = /^[=+\-@\t\r]/;

function sanitizeCell(value: string | number): string | number {
  if (typeof value !== 'string') return value;
  return FORMULA_START.test(value.trim()) ? `'${value.trim()}` : value;
}
