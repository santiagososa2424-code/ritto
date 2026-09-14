import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileColumns, fitsColumn, isProtectedHeader, normStr } from './sheetProfile.ts';
import { parseAmount } from './money.ts';

// ─────────────────────────────── importes ───────────────────────────────

test('el separador que manda es el último: así se lee la plata en Uruguay', () => {
  assert.equal(parseAmount('1.445,00'), 1445);
  assert.equal(parseAmount('1,445.00'), 1445);
  assert.equal(parseAmount('17.964'), 17964);
  assert.equal(parseAmount('$17,964.00'), 17964);
});

test('lo que no es un importe no se convierte en número', () => {
  assert.equal(parseAmount('Distr. del Sol'), null);
  assert.equal(parseAmount(''), null);
});

// ───────────────────────── columnas que no se tocan ─────────────────────────

test('las columnas que calcula la planilla quedan protegidas por el nombre', () => {
  for (const h of ['TOTAL MES', 'Total Mensual', 'TOTAL MENSUAL', 'Gasto Mensual', 'Total del mes', 'Acumulado', 'Saldo', 'Deuda', 'Fecha de pago', 'Estado pago']) {
    assert.ok(isProtectedHeader(h), `«${h}» tendría que estar protegida`);
  }
});

test('las columnas donde el usuario escribe siguen libres', () => {
  // "Costo" es la que se bloqueó de más y dejó facturas sin importe durante semanas.
  for (const h of ['Costo', 'Importe', 'Monto', 'Factura', 'Fecha', 'Proveedor', 'N°']) {
    assert.ok(!isProtectedHeader(h), `«${h}» no tendría que estar protegida`);
  }
});

test('normStr ignora acentos, mayúsculas y puntuación', () => {
  assert.equal(normStr('  N° Facturá '), 'n factura');
  assert.equal(normStr('TOTAL MES'), 'total mes');
});

// ──────────────── qué contiene cada columna, según los datos ────────────────

test('el tipo de cada columna sale de los datos, no del nombre del encabezado', () => {
  const headers = ['Dia', 'Detalle', 'Costo'];
  const filas = [
    ['19/8/2026', 'Mercadería', '$17.964,00'],
    ['2/9/2026', 'Mercadería', '$1.445,00'],
  ];
  const perfil = profileColumns(headers, filas);
  // "Dia" no dice "fecha" en ningún lado y aun así se reconoce como fecha.
  assert.equal(perfil['Dia'], 'fecha');
  assert.equal(perfil['Detalle'], 'texto');
  assert.equal(perfil['Costo'], 'dinero');
});

test('una fecha no entra en una columna de importes ni al revés', () => {
  // Es la barrera que evita el caso real de la fecha escrita en Total Mensual.
  assert.ok(!fitsColumn('19/8/2026', 'dinero'));
  assert.ok(!fitsColumn(17964, 'fecha'));
  assert.ok(fitsColumn(17964, 'dinero'));
  assert.ok(fitsColumn('19/8/2026', 'fecha'));
});

test('en una columna sin datos cargados todavía entra cualquier cosa', () => {
  // Sin ejemplos no hay con qué comparar: bloquear ahí dejaría la factura sin datos.
  assert.ok(fitsColumn('lo que sea', 'vacia'));
});
