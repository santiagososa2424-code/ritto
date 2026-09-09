// Importes escritos a la uruguaya y a la inglesa conviven en el mismo sistema: la
// planilla del usuario puede tener "$2.840,00" y el modelo devolver "2840.00" para el
// mismo número. Lo que decide cuál es el separador decimal es el ÚLTIMO que aparece,
// no una regla fija: borrar todos los puntos convertiría "1445.00" en 144500.
export function parseAmount(value: string): number | null {
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
    // Un separador solo, con exactamente tres dígitos detrás, agrupa miles ("1,500");
    // no marca decimales.
    if (onlySeparator && body.length - decIdx - 1 === 3) normalized = body.replace(/[.,]/g, '');
    else normalized = `${body.slice(0, decIdx).replace(/[.,]/g, '')}.${body.slice(decIdx + 1)}`;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return /^-/.test(s) ? -Math.abs(n) : n;
}

// Para campos que sabemos numéricos: acepta el número tal cual, interpreta el texto
// con parseAmount y, si aun así no sale, devuelve undefined en vez de un NaN que se
// propague hasta la planilla.
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const parsed = parseAmount(value);
  if (parsed != null) return parsed;
  const loose = Number(value.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(loose) ? loose : undefined;
}
