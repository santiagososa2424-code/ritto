import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaComparable, ordenPorFecha, elegirFilaDestino } from './sheetLayout.ts';

// La planilla del usuario tiene el encabezado en la fila 1 y los datos desde la 2.
const H = 1;
// Hasta dónde llegan las fórmulas de la plantilla.
const TEMPLATE = 30;

// Atajo para armar una pestaña: F es una fila con factura, V una fila vacía.
const F = (nro: string) => nro;
const V = () => '';

// ─────────────────────────────── fechas ───────────────────────────────

test('una celda de fecha real y su texto dan el mismo número', () => {
  // 46023 es el número de serie de Sheets para el 1/1/2026.
  assert.equal(fechaComparable(46023), fechaComparable('1/1/2026'));
  assert.equal(fechaComparable('2026-01-01'), fechaComparable('1/1/2026'));
});

test('se lee en orden uruguayo: D/M/Y', () => {
  // Si se leyera al revés, el 2/9 sería el 9 de febrero y quedaría antes que el 19/8.
  assert.ok(fechaComparable('19/8/2026')! < fechaComparable('2/9/2026')!);
  assert.equal(fechaComparable('22/08/2026'), fechaComparable('2026-08-22'));
});

test('un importe no se confunde con una fecha', () => {
  assert.equal(fechaComparable(17964), null);
  assert.equal(fechaComparable('17964'), null);
  assert.equal(fechaComparable('Distr. del Sol'), null);
  assert.equal(fechaComparable(''), null);
  assert.equal(fechaComparable(null), null);
});

// ──────────────────────────── orden de la pestaña ────────────────────────────

test('con una sola fecha cargada todavía no hay orden que respetar', () => {
  assert.equal(ordenPorFecha(['6/8/2026', ''], fechaComparable('18/8/2026')!, H), null);
});

test('una pestaña realmente desordenada se deja como está', () => {
  const celdas = ['20/8/2026', '1/8/2026', '19/8/2026', '2/8/2026'];
  assert.equal(ordenPorFecha(celdas, fechaComparable('5/8/2026')!, H), null);
});

test('unas pocas filas fuera de lugar no cancelan el orden', () => {
  // Es el estado real de la planilla: desordenada por exportaciones viejas de Ritto.
  // Exigir orden perfecto se mordía la cola y la factura del 1/8 terminaba al final.
  const celdas = ['6/8/2026', '19/8/2026', '10/8/2026'];
  const orden = ordenPorFecha(celdas, fechaComparable('1/8/2026')!, H);
  assert.notEqual(orden, null);
  assert.equal(orden!.pos, 2);   // delante de la primera, que es del 6/8
});

// ──────────────────────────── elección de la fila ────────────────────────────

function destino(filas: string[], fechaNueva: string, celdasFecha?: string[]) {
  const orden = ordenPorFecha(celdasFecha ?? [], fechaComparable(fechaNueva)!, H);
  return elegirFilaDestino([...['ENCABEZADO'], ...filas], H, TEMPLATE, orden, true);
}

test('la factura más nueva va después de la última con fecha, no en un hueco de arriba', () => {
  // El caso reportado: con una fila vacía arriba, una del 18/8 quedaba por encima de
  // una del 6/8 porque se tomaba "la primera fila libre" sin mirar las fechas.
  const r = destino([V(), F('A-1'), F('A-2')], '18/8/2026', ['', '6/8/2026', '10/8/2026']);
  assert.deepEqual(r, { fila: 5, modo: 'libre' });
});

test('la más vieja de todas corre la primera fila en vez de insertar arriba', () => {
  // Insertar por encima de la primera fila de datos la dejaría fuera del gasto
  // mensual: Sheets no estira un rango cuando la fila nueva cae justo antes.
  const r = destino([F('A-1'), F('A-2')], '1/8/2026', ['6/8/2026', '19/8/2026']);
  assert.deepEqual(r, { fila: 2, modo: 'correrPrimera' });
});

test('una del medio se inserta delante de la posterior', () => {
  const r = destino([F('A-1'), F('A-2')], '18/8/2026', ['6/8/2026', '20/8/2026']);
  assert.deepEqual(r, { fila: 3, modo: 'insertar' });
});

test('si justo encima hay una fila vacía se usa esa y no se agranda la planilla', () => {
  const r = destino([F('A-1'), V(), F('A-2')], '18/8/2026', ['6/8/2026', '', '20/8/2026']);
  assert.deepEqual(r, { fila: 3, modo: 'libre' });
});

test('sin orden por fecha se cae al comportamiento de siempre: primera fila libre', () => {
  const r = elegirFilaDestino(['ENCABEZADO', F('A-1'), V(), F('A-2')], H, TEMPLATE, null, true);
  assert.deepEqual(r, { fila: 3, modo: 'libre' });
});

test('con la plantilla llena se inserta adentro, para no quedar fuera de los totales', () => {
  // Sin filas libres y con fórmulas hasta la 4: la factura tiene que entrar dentro del
  // rango que suman los totales, no debajo de la última fila.
  const lleno = ['ENCABEZADO', F('A-1'), F('A-2'), F('A-3')];
  const r = elegirFilaDestino(lleno, H, 4, null, true);
  assert.equal(r.modo, 'insertar');
  assert.ok(r.fila <= 4);
});

test('sin permiso para insertar nunca se pisa una fila ocupada', () => {
  const lleno = ['ENCABEZADO', F('A-1'), F('A-2')];
  const r = elegirFilaDestino(lleno, H, 3, null, false);
  assert.equal(r.modo, 'libre');
  assert.ok(r.fila > 3, `la fila ${r.fila} pisaría una factura del usuario`);
});
