import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  segundosAhorrados, segundosAhorradosTotal, horasPorAnio,
  formatearTiempo, SEGUNDOS_FACTURA_TIPICA,
} from './tiempoAhorrado.ts';

const completa = {
  proveedor: 'El Trigal', rut: '100333100014', fecha: '2026-08-19', nroDocumento: 'A-74687',
  tipoDocumento: 'e-Factura', moneda: 'UYU', neto: 14724, ivaTotal: 3240, total: 17964,
  items: [
    { codigo: '1', descripcion: 'Mercadería', cantidad: 2, precioUnitario: 100, subtotal: 200 },
    { codigo: '2', descripcion: 'Mercadería', cantidad: 1, precioUnitario: 50, subtotal: 50 },
    { codigo: '3', descripcion: 'Mercadería', cantidad: 4, precioUnitario: 25, subtotal: 100 },
  ],
};

test('una factura con más ítems ahorra más, sin que nadie lo estime', () => {
  const unItem = { ...completa, items: completa.items.slice(0, 1) };
  assert.ok(segundosAhorrados(completa) > segundosAhorrados(unItem));
});

test('sólo cuenta los campos que Ritto llenó de verdad', () => {
  // Si no le leyó el RUT ni el número, no se cobra ese tiempo.
  const aMedias = { ...completa, rut: '', nroDocumento: undefined, items: [] };
  // Quedan 7 campos de cabecera de los 9.
  assert.equal(segundosAhorrados(aMedias), 7 * 4);
});

test('una factura vacía no ahorra nada', () => {
  assert.equal(segundosAhorrados({}), 0);
});

test('la factura tipo de la calculadora coincide con una factura real de tres ítems', () => {
  assert.equal(segundosAhorrados(completa), SEGUNDOS_FACTURA_TIPICA);
});

test('el total es la suma de las partes', () => {
  assert.equal(
    segundosAhorradosTotal([completa, completa]),
    segundosAhorrados(completa) * 2,
  );
});

test('la proyección anual usa 5 días por semana y 50 semanas', () => {
  // 10 facturas por día = 2500 al año, a 96 segundos cada una.
  assert.equal(Math.round(horasPorAnio(10)), Math.round((10 * 250 * 96) / 3600));
  assert.equal(horasPorAnio(0), 0);
});

test('el tiempo se muestra sin decimales', () => {
  assert.equal(formatearTiempo(45), '45 s');
  assert.equal(formatearTiempo(600), '10 min');
  assert.equal(formatearTiempo(3600), '1 h');
  assert.equal(formatearTiempo(8100), '2 h 15 min');
});
