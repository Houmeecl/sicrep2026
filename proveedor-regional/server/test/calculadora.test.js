import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularHuella, emisionesAsistente } from '../src/lib/calculadora.js';
import { FACTORES } from '../src/lib/factores.js';

const cerca = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

test('auto: ida y vuelta, dividido por ocupantes', () => {
  // Calama 215 km → 430 km × 0,48 / 2 ocupantes
  cerca(emisionesAsistente({ origen: 'calama', modo: 'auto', ocupantes: 2 }), (430 * FACTORES.auto_vehiculo_km) / 2);
});

test('avión: factor según distancia', () => {
  cerca(emisionesAsistente({ origen: 'santiago', modo: 'avion' }), 2200 * FACTORES.avion_domestico);
  cerca(emisionesAsistente({ origen: 'sudamerica', modo: 'avion' }), 5000 * FACTORES.avion_regional);
  cerca(emisionesAsistente({ origen: 'europa', modo: 'avion' }), 22000 * FACTORES.avion_internacional);
});

test('a pie u origen desconocido no emiten', () => {
  assert.equal(emisionesAsistente({ origen: 'antofagasta', modo: 'activo' }), 0);
  assert.equal(emisionesAsistente({ origen: 'marte', modo: 'auto' }), 0);
});

test('huella completa con categorías, criterios y extrapolación de transporte', () => {
  const r = calcularHuella({
    evento: { asistentes_estimados: 400, asistentes_reales: 200, dias: 2 },
    asistentes: [
      { origen: 'antofagasta', modo: 'bus', ocupantes: 1, noches: 0 },
      { origen: 'santiago', modo: 'avion', ocupantes: 1, noches: 2 },
    ],
    registros: [
      { categoria: 'energia', subtipo: 'electricidad_red', cantidad: 700, detalle: {} },
      { categoria: 'energia', subtipo: 'electricidad_renovable', cantidad: 300, detalle: {} },
      { categoria: 'residuos', subtipo: 'reciclaje', cantidad: 60, detalle: { material: 'plastico' } },
      { categoria: 'residuos', subtipo: 'vertedero', cantidad: 40, detalle: {} },
      { categoria: 'catering', subtipo: 'carne_pollo', cantidad: 10, detalle: {} },
      { categoria: 'agua', subtipo: 'agua_red', cantidad: 5, detalle: {} },
    ],
  });

  // Transporte: promedio de los 2 registrados × 200 asistentes reales.
  const promedio = (20 * FACTORES.bus_pasajero_km + 2200 * FACTORES.avion_domestico) / 2;
  const transporte = r.categorias.find((c) => c.id === 'transporte');
  cerca(transporte.tco2e, Math.round(promedio * 200) / 1000, 0.001);

  const energia = r.categorias.find((c) => c.id === 'energia');
  cerca(energia.tco2e, (700 * 0.4 + 300 * 0.05) / 1000, 0.001);

  const residuos = r.categorias.find((c) => c.id === 'residuos');
  cerca(residuos.tco2e, (60 * 0.02 + 40 * 0.517) / 1000, 0.001);
  cerca(r.residuos.emisiones_evitadas_tco2e, (60 * 1.2) / 1000, 0.001);

  // Infraestructura y otros estimados (sin datos medidos).
  assert.equal(r.categorias.find((c) => c.id === 'infraestructura').estimado, true);
  cerca(r.categorias.find((c) => c.id === 'infraestructura').tco2e, 0.15, 0.001);

  assert.equal(r.criterios.reciclaje_pct.valor, 60);
  assert.equal(r.criterios.reciclaje_pct.cumple, true);
  assert.equal(r.criterios.renovable_pct.valor, 30);
  assert.equal(r.criterios.renovable_pct.cumple, true);
  assert.equal(r.asistentes.base, 200);
  assert.equal(r.asistentes.cobertura_pct, 1);

  const sumaPct = r.categorias.reduce((a, c) => a + c.porcentaje, 0);
  cerca(sumaPct, 100, 0.5);
});

test('sin datos: criterios quedan sin evaluar', () => {
  const r = calcularHuella({ evento: { asistentes_estimados: 0, dias: 1 }, asistentes: [], registros: [] });
  assert.equal(r.total_tco2e, 0);
  assert.equal(r.kg_por_asistente, null);
  assert.equal(r.criterios.reciclaje_pct.cumple, null);
  assert.equal(r.evento_verde, false);
});
