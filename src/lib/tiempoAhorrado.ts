// Cuánto tiempo le ahorró Ritto al usuario.
//
// El número tiene que aguantar que un contador lo discuta. Si le ponemos uno que suene
// bien y el primero que haga la cuenta no le cierra, va a dejar de creerle también a los
// números que sí son reales —el IVA, los totales—, y esos son los que sostienen el
// producto. Por eso es deliberadamente conservador: es mejor que quede corto.

// Lo que se ahorra por cada factura que entra sola en la planilla. Quince segundos es
// una cuenta corta: leer el comprobante, tipear fecha, número e importe, y mirar que
// haya quedado bien. Nadie va a discutir que tarda menos que eso.
export const SEGUNDOS_POR_FACTURA = 15;

// El tiempo se cuenta cuando la factura entra en la planilla, no cuando se lee. Leerla
// sin exportarla no le ahorró el trabajo a nadie todavía.
export function segundosAhorrados(facturasExportadas: number): number {
  return Math.max(0, Math.floor(facturasExportadas)) * SEGUNDOS_POR_FACTURA;
}

// Un año de trabajo: cinco días por semana, cincuenta semanas. Las dos que faltan son
// las de licencia, y contarlas infla el número sin ninguna razón.
export const DIAS_LABORALES_POR_ANIO = 5 * 50;

export function horasPorAnio(facturasPorDia: number): number {
  return (facturasPorDia * DIAS_LABORALES_POR_ANIO * SEGUNDOS_POR_FACTURA) / 3600;
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
