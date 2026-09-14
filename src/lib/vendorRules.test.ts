import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vendorKeys, reglaAprendida } from './vendorRules.ts';

const factura = (proveedor: string, rut?: string) => ({ proveedor, rut });

test('la clave principal es el RUT, que no cambia entre facturas', () => {
  assert.deepEqual(
    vendorKeys(factura('MULTIVENTAS distribuciones', '100333100014')),
    ['rut:100333100014', 'nombre:multiventas distribuciones'],
  );
});

test('el RUT se normaliza aunque venga con puntos o guiones', () => {
  const [clave] = vendorKeys(factura('X', '21.000.123-0015'));
  assert.equal(clave, 'rut:210001230015');
});

test('sin RUT legible queda sólo el nombre', () => {
  assert.deepEqual(vendorKeys(factura('El Trigal')), ['nombre:el trigal']);
});

test('el RUT manda aunque el nombre haya cambiado del todo', () => {
  // Una factura sale a nombre de la razón social y la siguiente al del titular.
  const aprendidas = { 'rut:100333100014': 'Multiv.' };
  const r = reglaAprendida(factura('BARRANDEGUY NUÑEZ RUBEN', '100333100014'), aprendidas);
  assert.deepEqual(r, { pestana: 'Multiv.', exacta: true });
});

test('sin RUT, razón social y nombre fantasía se reconocen como el mismo proveedor', () => {
  // Es el caso que hacía que Ritto repreguntara una pestaña ya elegida.
  const aprendidas = { 'nombre:distribuidora del sol sas': 'Distr. del Sol' };
  const r = reglaAprendida(factura('Distribuidora del Sol'), aprendidas);
  assert.deepEqual(r, { pestana: 'Distr. del Sol', exacta: false });
});

test('el parecido corta en un espacio: dos proveedores distintos no se mezclan', () => {
  const aprendidas = { 'nombre:distribuidora': 'Pestaña A' };
  assert.equal(reglaAprendida(factura('Distribuidoranorte'), aprendidas), null);
});

test('un nombre que sólo comparte una palabra suelta no engancha', () => {
  const aprendidas = { 'nombre:rola ltda': 'Resumen' };
  assert.equal(reglaAprendida(factura('Rolando Perez'), aprendidas), null);
});

test('nombres muy cortos no alcanzan para adivinar', () => {
  const aprendidas = { 'nombre:sol': 'Pestaña A' };
  assert.equal(reglaAprendida(factura('Solymar'), aprendidas), null);
});

test('sin ninguna regla guardada no se inventa ninguna', () => {
  assert.equal(reglaAprendida(factura('El Trigal', '100333100014'), {}), null);
});
