// La memoria de a qué pestaña va cada proveedor.
//
// Vive acá y no en el endpoint porque es la pieza que decide si Ritto le vuelve a
// preguntar al usuario algo que ya le enseñó, y eso hay que poder probarlo.

import { normStr } from './sheetProfile.ts';

// Busca la regla que el usuario enseñó para este proveedor. Primero por clave exacta
// —el RUT, que no se mueve—. Pero el RUT no siempre se lee: en una foto borrosa o un
// escaneo torcido lo único que queda es el nombre, y el nombre cambia entre facturas
// del mismo proveedor: razón social en una, nombre fantasía en la otra. Ahí alcanza con
// que uno empiece con el otro —"distribuidora del sol sas" y "distribuidora del sol"
// son el mismo— y no con que uno contenga al otro en cualquier posición, que haría que
// "sol" enganchara con cualquier cosa.
export function reglaAprendida(
  inv: Record<string, unknown>,
  aprendidas: Record<string, string>,
): { pestana: string; exacta: boolean } | null {
  const keys = vendorKeys(inv);
  for (const k of keys) {
    if (aprendidas[k]) return { pestana: aprendidas[k], exacta: true };
  }

  const nombre = keys.find((k) => k.startsWith('nombre:'))?.slice('nombre:'.length) ?? '';
  if (nombre.length < 5) return null;
  for (const [k, pestana] of Object.entries(aprendidas)) {
    if (!k.startsWith('nombre:')) continue;
    const guardado = k.slice('nombre:'.length);
    if (guardado.length < 5) continue;
    // El prefijo tiene que cortar en un espacio: si no, "distribuidora" engancharía
    // con "distribuidoranorte", que es otro proveedor.
    const prefijo = (largo: string, corto: string) =>
      largo === corto || (largo.startsWith(corto) && largo[corto.length] === ' ');
    if (prefijo(guardado, nombre) || prefijo(nombre, guardado)) {
      return { pestana, exacta: false };
    }
  }
  return null;
}

export function vendorKeys(inv: Record<string, unknown>): string[] {
  const keys: string[] = [];
  const rut = typeof inv.rut === 'string' ? inv.rut.replace(/\D/g, '') : '';
  if (rut.length >= 8) keys.push(`rut:${rut}`);
  const nombre = typeof inv.proveedor === 'string' ? normStr(inv.proveedor) : '';
  if (nombre) keys.push(`nombre:${nombre}`);
  return keys;
}

