import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLANILLAS, filasDeDatos, columna } from './fixtures/planillas.ts';
import { findHeaderRow, namedHeaders, formulaColumns, isGhost } from './sheetHeaders.ts';
import { profileColumns, fitsColumn } from './sheetProfile.ts';
import { fechaComparable, ordenPorFecha, elegirFilaDestino } from './sheetLayout.ts';

// Cada planilla de fixtures/planillas.ts pasa por lo mismo que haría una de verdad:
// encontrar el encabezado, nombrar las columnas, ver cuáles tienen fórmula. Si mañana
// aparece un cliente con una forma nueva, se agrega ahí y estos tests la cubren sola.

for (const p of PLANILLAS) {
  test(`«${p.nombre}»: ${p.particularidad}`, () => {
    const fila = findHeaderRow(p.celdas.map((f) => f.map(String)));
    assert.equal(fila, p.esperado.filaEncabezado, 'fila del encabezado');

    const headers = namedHeaders((p.celdas[fila - 1] ?? []).map(String));
    assert.deepEqual(
      headers.filter((h) => !isGhost(h)),
      p.esperado.columnas,
      'columnas leídas',
    );

    // Una columna sin título tiene que ocupar su casillero igual: si se la saca, todo
    // lo que viene después se corre un lugar y la fila queda desalineada.
    assert.equal(headers.length, (p.celdas[fila - 1] ?? []).length, 'ancho de la fila');

    const conFormula = formulaColumns(headers, filasDeDatos(p).map((f) => f.map(String)));
    assert.deepEqual(Array.from(conFormula).sort(), [...p.esperado.conFormula].sort(), 'columnas con fórmula');
  });
}

// ─────────────────────── lo que cada planilla debería deducir ───────────────────────

const busca = (nombre: string) => {
  const p = PLANILLAS.find((x) => x.nombre === nombre);
  if (!p) throw new Error(`falta la planilla «${nombre}»`);
  return p;
};

test('«nombres-propios»: el tipo de columna sale de los datos, no del encabezado', () => {
  // "Día", "Quién" y "Cuánto" no contienen ninguna palabra contable. Si Ritto dependiera
  // del nombre, esta planilla no se podría usar.
  const p = busca('nombres-propios');
  const headers = (p.celdas[0] ?? []).map(String);
  const perfil = profileColumns(headers, filasDeDatos(p).map((f) => f.map(String)));
  assert.equal(perfil['Día'], 'fecha');
  assert.equal(perfil['Quién'], 'texto');
  // 'dinero' o 'numero' según venga con separadores: para lo que decide después es lo
  // mismo, lo que importa es que un importe entre y una fecha no.
  assert.ok(['dinero', 'numero'].includes(perfil['Cuánto']), `«Cuánto» quedó como ${perfil['Cuánto']}`);
  assert.ok(fitsColumn(17964, perfil['Cuánto']));
  assert.ok(!fitsColumn('19/8/2026', perfil['Cuánto']), 'una fecha no puede entrar ahí');
  assert.ok(!fitsColumn(17964, perfil['Día']), 'un importe no puede entrar en la de fechas');
});

test('«descendente»: una factura del medio entra en su lugar, no al final', () => {
  const p = busca('descendente');
  const fechas = columna(p, 'Fecha');
  // Las filas van 19/8, 10/8, 6/8. Una del 15/8 va entre la primera y la segunda.
  const orden = ordenPorFecha(fechas, fechaComparable('15/8/2026')!, 1);
  assert.notEqual(orden, null, 'una planilla al revés también está ordenada');
  assert.equal(orden!.pos, 3, 'delante de la del 10/8');
});

test('«descendente»: la más nueva de todas va arriba de todo', () => {
  const p = busca('descendente');
  const orden = ordenPorFecha(columna(p, 'Fecha'), fechaComparable('25/8/2026')!, 1);
  const destino = elegirFilaDestino(['Fecha', ...columna(p, 'Factura')], 1, 4, orden, true);
  // Arriba de todo, corriendo la primera fila para no quedar fuera de los totales.
  assert.deepEqual(destino, { fila: 2, modo: 'correrPrimera' });
});

test('«descendente»: la más vieja de todas va al final', () => {
  const p = busca('descendente');
  const orden = ordenPorFecha(columna(p, 'Fecha'), fechaComparable('1/8/2026')!, 1);
  assert.equal(orden!.pos, null, 'no va delante de ninguna: va después de la última');
});

test('«clasica»: la suma del final no puede bloquear la columna de la factura', () => {
  // formulaColumns marca Costo porque abajo hay un =SUM. La decisión real se toma
  // mirando la celda de destino: la de una factura nueva está libre y se escribe.
  const p = busca('clasica');
  const headers = (p.celdas[0] ?? []).map(String);
  const conFormula = formulaColumns(headers, filasDeDatos(p).map((f) => f.map(String)));
  assert.ok(conFormula.has('Costo'), 'la columna figura como calculada…');

  const filaDeFactura = p.celdas[1].map(String);
  const idxCosto = headers.indexOf('Costo');
  const idxDeuda = headers.indexOf('Deuda');
  assert.ok(!filaDeFactura[idxCosto].startsWith('='), '…pero la celda de la factura no lo es');
  assert.ok(filaDeFactura[idxDeuda].startsWith('='), 'Deuda sí lo es y no se toca');
});

test('«mes-vacio»: sin datos cargados no se inventa un orden', () => {
  const p = busca('mes-vacio');
  assert.equal(ordenPorFecha(columna(p, 'Fecha'), fechaComparable('6/8/2026')!, 1), null);
});

test('«total-arriba»: la factura no cae en la fila del total', () => {
  const p = busca('total-arriba');
  const fila = findHeaderRow(p.celdas.map((f) => f.map(String)));
  const destino = elegirFilaDestino(
    ['Fecha', ...columna(p, 'Fecha')],
    fila,
    0,
    ordenPorFecha(columna(p, 'Fecha'), fechaComparable('25/8/2026')!, fila),
    true,
  );
  assert.ok(destino.fila > fila, 'nunca por encima del encabezado');
  assert.notEqual(destino.fila, 1, 'la fila 1 es el total del mes');
});
