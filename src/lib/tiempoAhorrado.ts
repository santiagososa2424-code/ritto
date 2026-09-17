// Cuánto tiempo le ahorró Ritto al usuario.
//
// El número tiene que aguantar que un contador lo discuta. Si le ponemos "2 minutos por
// factura" porque suena bien, el primero que haga la cuenta y no le cierre va a dejar de
// creerle también a los números que sí son reales —el IVA, los totales—, y esos son los
// que sostienen el producto.
//
// Por eso no se estima por factura: se cuenta campo por campo lo que Ritto llenó de
// verdad. Una factura con diez ítems ahorra más que una de uno, y eso sale solo.

// Lo que tarda una persona en pasar un campo de un papel a una planilla: leerlo,
// tipearlo y mirar que haya quedado bien. Cuatro segundos es conservador a propósito:
// es mejor que el número quede corto y sea indiscutible.
export const SEGUNDOS_POR_CAMPO = 4;

type ItemLike = {
  codigo?: unknown; descripcion?: unknown; cantidad?: unknown;
  precioUnitario?: unknown; subtotal?: unknown;
};

type FacturaLike = {
  proveedor?: unknown; rut?: unknown; fecha?: unknown; nroDocumento?: unknown;
  tipoDocumento?: unknown; moneda?: unknown; neto?: unknown; ivaTotal?: unknown;
  total?: unknown; items?: ItemLike[];
};

const lleno = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';

export function segundosAhorrados(inv: FacturaLike): number {
  const cabecera = [
    inv.proveedor, inv.rut, inv.fecha, inv.nroDocumento,
    inv.tipoDocumento, inv.moneda, inv.neto, inv.ivaTotal, inv.total,
  ].filter(lleno).length;

  const deItems = (inv.items ?? []).reduce(
    (n, it) => n + [it.codigo, it.descripcion, it.cantidad, it.precioUnitario, it.subtotal].filter(lleno).length,
    0,
  );

  return (cabecera + deItems) * SEGUNDOS_POR_CAMPO;
}

export function segundosAhorradosTotal(invs: FacturaLike[]): number {
  return invs.reduce((n, inv) => n + segundosAhorrados(inv), 0);
}

// Una factura corriente: los nueve campos de cabecera y tres ítems. Sirve para estimar
// cuando todavía no hay datos propios —la calculadora de la home, por ejemplo—.
export const SEGUNDOS_FACTURA_TIPICA = (9 + 3 * 5) * SEGUNDOS_POR_CAMPO;   // 96 s

// Un año de trabajo: cinco días por semana, cincuenta semanas. Las dos que faltan son
// las de licencia, y contarlas infla el número sin ninguna razón.
export const DIAS_LABORALES_POR_ANIO = 5 * 50;

export function horasPorAnio(facturasPorDia: number): number {
  return (facturasPorDia * DIAS_LABORALES_POR_ANIO * SEGUNDOS_FACTURA_TIPICA) / 3600;
}

// "2 h 15 min", "45 min", "30 s". Sin decimales: un tiempo ahorrado con coma se lee como
// una cuenta inventada.
export function formatearTiempo(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
