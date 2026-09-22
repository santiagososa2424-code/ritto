import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  segundosAhorrados, horasPorAnio, formatearTiempo,
  SEGUNDOS_POR_FACTURA, DIAS_LABORALES_POR_ANIO,
} from './tiempoAhorrado.ts';

test('el tiempo se cuenta por factura, no por exportación', () => {
  // Mandar diez facturas de una vez ahorra diez veces, no una. Es el caso que estaba
  // mal: una exportación en lote sumaba como si hubiera sido una sola factura.
  assert.equal(segundosAhorrados(10), 10 * SEGUNDOS_POR_FACTURA);
  assert.equal(segundosAhorrados(1), SEGUNDOS_POR_FACTURA);
});

test('sin facturas exportadas no hay tiempo ahorrado', () => {
  assert.equal(segundosAhorrados(0), 0);
  assert.equal(segundosAhorrados(-3), 0);
});

test('la proyección anual usa 5 días por semana y 50 semanas', () => {
  assert.equal(
    Math.round(horasPorAnio(10)),
    Math.round((10 * DIAS_LABORALES_POR_ANIO * SEGUNDOS_POR_FACTURA) / 3600),
  );
  assert.equal(horasPorAnio(0), 0);
});

test('el tiempo se muestra sin decimales', () => {
  assert.equal(formatearTiempo(45), '45 s');
  assert.equal(formatearTiempo(600), '10 min');
  assert.equal(formatearTiempo(3600), '1 h');
  assert.equal(formatearTiempo(8100), '2 h 15 min');
});
