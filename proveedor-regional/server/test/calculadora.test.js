import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularHuella, emisionesAsistente, distanciaKm, tramo } from '../src/lib/calculadora.js';
import { FACTORES as F, CIUDAD_POR_ID, CIUDADES } from '../src/lib/factores.js';

const cerca = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const EVENTO = { ciudad_base: 'antofagasta', km_aeropuerto: 25, dias: 2 };

test('todas las ciudades tienen coordenadas o distancia fija', () => {
  for (const c of CIUDADES) assert.ok(c.km || (Number.isFinite(c.lat) && Number.isFinite(c.lng)), c.id);
});

test('distancia ortodrómica razonable (Antofagasta–Santiago ≈ 1.090 km)', () => {
  const d = distanciaKm(CIUDAD_POR_ID.antofagasta, CIUDAD_POR_ID.santiago);
  assert.ok(d > 1050 && d < 1130, String(d));
});

test('auto: ida y vuelta por carretera, dividido por ocupantes', () => {
  const t = tramo('calama', 'antofagasta');
  const esperado = (2 * t.km * F.sinuosidad_vial * F.auto_vehiculo_km) / 2;
  cerca(emisionesAsistente({ origen: 'calama', modo: 'auto', ocupantes: 2 }, EVENTO).total, esperado);
});

test('avión: ajuste de ruta, banda por distancia y traslado al aeropuerto', () => {
  const km = tramo('paris', 'antofagasta').km * F.ajuste_ruta_aerea;
  const r = emisionesAsistente({ origen: 'paris', modo: 'avion', modo_local: 'transfer' }, EVENTO);
  cerca(r.vuelo, 2 * km * F.avion_internacional);
  cerca(r.terrestre, 2 * 25 * F.bus_pasajero_km);

  const sinLocal = emisionesAsistente({ origen: 'santiago', modo: 'avion' }, EVENTO);
  cerca(sinLocal.terrestre, 2 * 25 * F.auto_vehiculo_km); // supone taxi si no declaró
});

test('misma ciudad y orígenes genéricos', () => {
  cerca(emisionesAsistente({ origen: 'antofagasta', modo: 'taxi' }, EVENTO).total, 2 * F.km_misma_ciudad * F.auto_vehiculo_km);
  assert.equal(emisionesAsistente({ origen: 'antofagasta', modo: 'activo' }, EVENTO).total, 0);
  assert.equal(emisionesAsistente({ origen: 'marte', modo: 'auto' }, EVENTO).total, 0);
  cerca(emisionesAsistente({ origen: 'otro_europa', modo: 'avion' }, EVENTO).vuelo, 2 * 11000 * F.avion_internacional);
  cerca(emisionesAsistente({ origen: 'europa', modo: 'avion' }, EVENTO).vuelo, 2 * 11000 * F.avion_internacional); // id antiguo
});

test('la sede del evento cambia las distancias', () => {
  const desdeAntofa = emisionesAsistente({ origen: 'calama', modo: 'bus' }, EVENTO).total;
  const desdeCalama = emisionesAsistente({ origen: 'calama', modo: 'bus' }, { ...EVENTO, ciudad_base: 'calama' }).total;
  assert.ok(desdeCalama < desdeAntofa);
});

const BASE = {
  evento: { ...EVENTO, asistentes_estimados: 400, asistentes_reales: 200 },
  asistentes: [
    { origen: 'antofagasta', modo: 'bus', ocupantes: 1, noches: 0 },
    { origen: 'santiago', modo: 'avion', ocupantes: 1, noches: 2, modo_local: 'taxi' },
  ],
  registros: [
    { categoria: 'energia', subtipo: 'electricidad_red', cantidad: 700, detalle: {} },
    { categoria: 'energia', subtipo: 'electricidad_renovable', cantidad: 300, detalle: {} },
    { categoria: 'energia', subtipo: 'diesel', cantidad: 100, detalle: {} },
    { categoria: 'residuos', subtipo: 'reciclaje', cantidad: 60, detalle: { material: 'plastico' } },
    { categoria: 'residuos', subtipo: 'vertedero', cantidad: 40, detalle: {} },
    { categoria: 'catering', subtipo: 'carne_pollo', cantidad: 10, detalle: {} },
  ],
};

test('huella completa: categorías, alcances, extensión y criterios', () => {
  const r = calcularHuella(BASE);
  const a = BASE.asistentes.map((x) => emisionesAsistente(x, BASE.evento));
  const transporteKg = (a[0].total + a[1].total) * 100; // 2 registrados → 200 asistentes
  cerca(r.categorias.find((c) => c.id === 'transporte').tco2e, Math.round(transporteKg) / 1000, 0.001);
  cerca(r.transporte.vuelos_tco2e, (a[1].vuelo * 100) / 1000, 0.001);

  cerca(r.alcances[0].tco2e, (100 * F.diesel) / 1000, 0.001);
  cerca(r.alcances[1].tco2e, (700 * F.electricidad_red + 300 * F.electricidad_renovable) / 1000, 0.001);
  cerca(r.alcances.reduce((s, x) => s + x.tco2e, 0), r.total_tco2e, 0.002);

  cerca(r.residuos.emisiones_evitadas_tco2e, (60 * F.evitada_plastico) / 1000, 0.001);
  assert.equal(r.criterios.reciclaje_pct.valor, 60);
  assert.equal(r.criterios.renovable_pct.valor, 30);
  assert.ok(r.kg_por_asistente_sin_vuelos < r.kg_por_asistente);

  const sumaPct = r.categorias.reduce((s, c) => s + c.porcentaje, 0);
  cerca(sumaPct, 100, 0.5);
  cerca(r.calidad.medido_pct + r.calidad.extendido_pct + r.calidad.estimado_pct, 100, 0.5);
  assert.ok(r.calidad.extendido_pct > 0);
});

test('alojamiento: solo se suma con factor definido', () => {
  const sin = calcularHuella(BASE);
  assert.equal(sin.categorias.find((c) => c.id === 'alojamiento').tco2e, 0);
  assert.equal(sin.categorias.find((c) => c.id === 'alojamiento').sin_factor, true);

  const con = calcularHuella({ ...BASE, evento: { ...BASE.evento, factor_alojamiento_kg_noche: 20 } });
  // 2 noches registradas × 100 de extensión × 20 kg
  cerca(con.categorias.find((c) => c.id === 'alojamiento').tco2e, 4, 0.001);
});

test('sin datos: criterios quedan sin evaluar', () => {
  const r = calcularHuella({ evento: { asistentes_estimados: 0, dias: 1 }, asistentes: [], registros: [] });
  assert.equal(r.total_tco2e, 0);
  assert.equal(r.kg_por_asistente, null);
  assert.equal(r.criterios.reciclaje_pct.cumple, null);
  assert.equal(r.evento_verde, false);
});
