// Dónde va cada factura dentro de la pestaña.
//
// Esto vivía adentro de `append.ts`, mezclado con las llamadas a la API de Sheets, y
// por eso no se podía probar sin una planilla de verdad. Es la parte más frágil del
// sistema —se rompió cuatro veces— y cada arreglo se verificaba abriendo la planilla a
// ojo. Acá queda separada de la red: entra lo que dice la planilla, sale la decisión.

// Sheets cuenta los días desde el 30/12/1899 y JavaScript desde el 1/1/1970. Para
// comparar una celda contra la fecha de la factura hay que llevarlas a la misma cuenta.
const SERIE_SHEETS_A_UNIX = 25569;

// Una fecha convertida a un número que se puede comparar. Una celda de fecha de verdad
// vuelve como número de serie, que es lo que más conviene: no hay ambigüedad posible
// entre día y mes. Si la columna guarda texto se parsea, y ahí sí manda el orden
// uruguayo: D/M/Y.
export function fechaComparable(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Un número fuera del rango de fechas razonables es otra cosa, no una fecha.
    if (v < 20000 || v > 80000) return null;
    return v - SERIE_SHEETS_A_UNIX;
  }
  const s = String(v ?? '').trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]) / 86400000;
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const y = +dmy[3] < 100 ? 2000 + +dmy[3] : +dmy[3];
    return Date.UTC(y, +dmy[2] - 1, +dmy[1]) / 86400000;
  }
  return null;
}

// Dónde va la factura según la fecha. `pos` es la fila delante de la cual hay que
// meterla, o null si es la más nueva y va al final. `ultima` es la última fila con
// fecha: hace falta incluso cuando `pos` es null, porque "al final" significa después
// de esa fila y no en el primer hueco que aparezca —la planilla tiene huecos entre
// medio, y caer en uno dejaba la factura nueva por encima de las viejas—.
// Devuelve null entero cuando la columna no viene ordenada: ahí meterla "en su lugar"
// sería imponerle al usuario un orden que su planilla no tiene.
export type OrdenFecha = { pos: number | null; ultima: number };

export function ordenPorFecha(
  celdas: unknown[],
  fecha: number,
  headerRow: number,
): OrdenFecha | null {
  const filas: Array<{ row: number; fecha: number }> = [];
  for (let i = 0; i < celdas.length; i++) {
    const f = fechaComparable(celdas[i]);
    if (f != null) filas.push({ row: headerRow + 1 + i, fecha: f });
  }
  // Con una sola fecha cargada no hay orden que respetar todavía.
  if (filas.length < 2) return null;

  // Unas pocas filas fuera de lugar no quieren decir que la pestaña no sea cronológica:
  // suelen ser de exportaciones viejas de Ritto, justo las que hay que dejar de
  // producir. Exigir orden perfecto se mordía la cola —una planilla ya desordenada no
  // se podía volver a ordenar nunca— y era la razón por la que una factura del 1/8
  // terminaba abajo de una del 19/8.
  let inversiones = 0;
  for (let i = 1; i < filas.length; i++) {
    if (filas[i].fecha < filas[i - 1].fecha) inversiones++;
  }
  if (inversiones > Math.max(1, Math.floor(filas.length * 0.25))) return null;

  const posterior = filas.find((f) => f.fecha > fecha);
  return { pos: posterior ? posterior.row : null, ultima: filas[filas.length - 1].row };
}

export type Destino = {
  fila: number;
  // 'libre'          — la fila ya estaba vacía, se escribe y listo.
  // 'insertar'       — hay que abrir una fila nueva ahí y heredarle las fórmulas.
  // 'correrPrimera'  — la factura es más vieja que todas: se abre una fila abajo y la
  //                    primera se corre, para no dejar la nueva afuera de los totales.
  modo: 'libre' | 'insertar' | 'correrPrimera';
};

// La decisión completa, sin tocar la red.
//
// `checkCells` son los valores de una columna que Ritto sí llena, desde el encabezado
// hacia abajo: es con lo que se mide qué filas están ocupadas. `lastTemplate` es la
// última fila que todavía tiene fórmulas, o sea hasta dónde llega la plantilla armada.
export function elegirFilaDestino(
  checkCells: unknown[],
  headerRow: number,
  lastTemplate: number,
  ordenFecha: OrdenFecha | null,
  puedeInsertar: boolean,
): Destino {
  const vacia = (v: unknown) => v == null || String(v).trim() === '';

  // Take the FIRST free row, not the one after the last used cell. These templates
  // usually carry a totals row, a second block or notes well below the data, and
  // counting to the end drops the invoice underneath all of it.
  const primeraLibre = (desde: number): number => {
    for (let i = Math.max(1, desde - headerRow); i < checkCells.length; i++) {
      if (vacia(checkCells[i])) return headerRow + i;
    }
    return -1;
  };

  // Cuando hay orden por fecha y la factura es la más nueva, "al final" es después de
  // la última fila con fecha. Buscar el primer hueco desde el encabezado la metía en
  // cualquier fila vacía intermedia, por encima de facturas más viejas: era el caso de
  // una del 18/8 quedando arriba de una del 6/8.
  const desdeFila = ordenFecha && ordenFecha.pos == null ? ordenFecha.ultima + 1 : headerRow + 1;
  const free = primeraLibre(desdeFila);
  const used = checkCells.length;
  // Trailing blanks are omitted from the response, so a template that is only half
  // filled ends the read early: past the last value, the next row is free too.
  const firstFree = free > 0 ? free : Math.max(used + headerRow, desdeFila);

  if (ordenFecha?.pos != null) {
    // Entra delante de una factura posterior. Si justo encima hay una fila vacía del
    // template, se usa esa y no hace falta agrandar nada.
    // Es seguro: `pos` es la primera fila con fecha posterior, así que todo lo de
    // arriba tiene fecha anterior o igual a la nuestra.
    const hueco = ordenFecha.pos - 1;
    if (hueco > headerRow && vacia(checkCells[hueco - headerRow])) {
      return { fila: hueco, modo: 'libre' };
    }
    if (ordenFecha.pos === headerRow + 1) {
      // La factura es más vieja que todas y le toca la primera fila de datos. Insertar
      // ahí la dejaría afuera del gasto mensual: Sheets estira un rango cuando la fila
      // nueva cae adentro, pero no cuando cae justo antes de donde empieza —=SUMA(D2:D40)
      // pasa a ser =SUMA(D3:D41) y la fila 2, la nuestra, queda sin sumar—.
      // Así que se inserta una fila más abajo, que sí estira el rango, se corre ahí la
      // primera factura y la nuestra ocupa el lugar que le corresponde.
      return { fila: headerRow + 1, modo: 'correrPrimera' };
    }
    return { fila: ordenFecha.pos, modo: 'insertar' };
  }

  if (lastTemplate === 0 || firstFree <= lastTemplate) {
    return { fila: firstFree, modo: 'libre' };     // a real gap inside the table
  }
  if (lastTemplate > 0 && puedeInsertar) {
    // The table is full. Insert *inside* it, at its last row, pushing that line and
    // everything below one down. Inserting after the last row would leave the
    // invoice outside a total that sums up to it: Sheets only stretches a range
    // when the new row falls within it, never when it lands just past the end.
    return { fila: Math.max(lastTemplate, headerRow + 2), modo: 'insertar' };
  }
  // no formulas here, nothing to stay inside of
  return { fila: Math.max(used + headerRow, headerRow + 1), modo: 'libre' };
}
