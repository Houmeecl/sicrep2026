// Cálculo de huella de carbono de un evento (metodología KONTAX Events).
// Función pura: recibe datos y devuelve resultados, sin acceso a base de datos.
import {
  FACTORES,
  CIUDAD_POR_ID,
  CRITERIOS_VERDE,
  CATEGORIAS,
  ALCANCE_ENERGIA,
} from './factores.js';

// Orígenes de la primera versión del formulario (sin coordenadas), por compatibilidad.
const ORIGENES_ANTERIORES = {
  centro_sur: 1500,
  sudamerica: 2500,
  america_norte: 7500,
  europa: 11000,
  otro_continente: 15000,
};

const RADIO_TIERRA_KM = 6371;

export function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

function factorAvion(km, f) {
  if (km > 3500) return f.avion_internacional;
  if (km >= 1500) return f.avion_regional;
  return f.avion_domestico;
}

function factorTerrestre(modo, ocupantes, f) {
  switch (modo) {
    case 'auto':
      return f.auto_vehiculo_km / Math.max(1, Number(ocupantes) || 1);
    case 'taxi':
      return f.auto_vehiculo_km;
    case 'bus':
    case 'transfer':
      return f.bus_pasajero_km;
    default:
      return 0;
  }
}

/**
 * Distancia de un tramo (solo ida) entre el origen declarado y la sede del evento.
 * @returns {{ km: number, mismaCiudad: boolean, fija: boolean } | null}
 */
export function tramo(origenId, sedeId, f = FACTORES) {
  if (ORIGENES_ANTERIORES[origenId]) return { km: ORIGENES_ANTERIORES[origenId], mismaCiudad: false, fija: true };
  const origen = CIUDAD_POR_ID[origenId];
  const sede = CIUDAD_POR_ID[sedeId] || CIUDAD_POR_ID.antofagasta;
  if (!origen) return null;
  if (origen.km) return { km: origen.km, mismaCiudad: false, fija: true };
  const km = distanciaKm(sede, origen);
  if (km < 5) return { km: f.km_misma_ciudad, mismaCiudad: true, fija: true };
  return { km, mismaCiudad: false, fija: false };
}

/**
 * Emisiones de traslado ida y vuelta de un asistente, en kgCO2e.
 * @returns {{ vuelo: number, terrestre: number, total: number }}
 */
export function emisionesAsistente(asistente, evento = {}, f = FACTORES) {
  const t = tramo(asistente.origen, evento.ciudad_base, f);
  if (!t) return { vuelo: 0, terrestre: 0, total: 0 };

  let vuelo = 0;
  let terrestre = 0;
  if (asistente.modo === 'avion' && !t.mismaCiudad) {
    const km = t.fija ? t.km : t.km * f.ajuste_ruta_aerea;
    vuelo = 2 * km * factorAvion(km, f);
    // Traslado aeropuerto ↔ evento, ida y vuelta. Si no se declaró, se supone taxi.
    const kmAeropuerto = Number(evento.km_aeropuerto ?? 25);
    terrestre = 2 * kmAeropuerto * factorTerrestre(asistente.modo_local || 'taxi', 1, f);
  } else {
    const km = t.fija ? t.km : t.km * f.sinuosidad_vial;
    const modo = asistente.modo === 'avion' ? 'taxi' : asistente.modo;
    terrestre = 2 * km * factorTerrestre(modo, asistente.ocupantes, f);
  }
  return { vuelo, terrestre, total: vuelo + terrestre };
}

const suma = (lista) => lista.reduce((a, b) => a + b, 0);
const redondear = (n, dec = 2) => {
  const p = 10 ** dec;
  return Math.round(n * p) / p;
};

/**
 * @param {object} p
 * @param {object} p.evento        asistentes_estimados, asistentes_reales, dias, ciudad_base,
 *                                  km_aeropuerto, factor_alojamiento_kg_noche
 * @param {object[]} p.asistentes  origen, modo, ocupantes, noches, modo_local
 * @param {object[]} p.registros   categoria, subtipo, cantidad, detalle
 */
export function calcularHuella({ evento, asistentes, registros }, f = FACTORES) {
  const registrados = asistentes.length;
  // Asistentes considerados: los reales si ya se informaron; si no, el mayor entre registrados y estimados.
  const base = Number(evento.asistentes_reales) || Math.max(registrados, Number(evento.asistentes_estimados) || 0);
  const extension = registrados ? base / registrados : 0;

  // 1. Transporte: suma de los registrados, extendida al total de asistentes.
  const traslados = asistentes.map((a) => emisionesAsistente(a, evento, f));
  const vuelosKg = suma(traslados.map((t) => t.vuelo)) * extension;
  const terrestreKg = suma(traslados.map((t) => t.terrestre)) * extension;
  const transporteKg = vuelosKg + terrestreKg;

  const modos = {};
  for (const a of asistentes) modos[a.modo] = (modos[a.modo] || 0) + 1;

  // 2. Alojamiento: solo si el evento tiene un factor por noche definido.
  const noches = suma(asistentes.map((a) => Number(a.noches) || 0));
  const factorNoche = evento.factor_alojamiento_kg_noche === null || evento.factor_alojamiento_kg_noche === undefined
    ? null
    : Number(evento.factor_alojamiento_kg_noche);
  const nochesExtendidas = noches * extension;
  const alojamientoKg = factorNoche === null ? 0 : nochesExtendidas * factorNoche;

  const porCat = (cat) => registros.filter((r) => r.categoria === cat);

  // 3. Energía, separada por alcance.
  let energiaKg = 0;
  let alcance1Kg = 0;
  let alcance2Kg = 0;
  let kwhRed = 0;
  let kwhRenovable = 0;
  for (const r of porCat('energia')) {
    const factor = f[r.subtipo];
    if (factor === undefined) continue;
    const kg = r.cantidad * factor;
    energiaKg += kg;
    if (ALCANCE_ENERGIA[r.subtipo] === 1) alcance1Kg += kg;
    else alcance2Kg += kg;
    if (r.subtipo === 'electricidad_red') kwhRed += r.cantidad;
    if (r.subtipo === 'electricidad_renovable') kwhRenovable += r.cantidad;
  }

  // 4. Residuos: emisiones del destino + emisiones evitadas informadas aparte.
  let residuosKg = 0;
  let evitadasKg = 0;
  let residuosTotalKg = 0;
  let residuosValorizadosKg = 0;
  for (const r of porCat('residuos')) {
    residuosTotalKg += r.cantidad;
    if (r.subtipo === 'reciclaje') {
      residuosKg += r.cantidad * f.residuo_reciclaje_proceso;
      residuosValorizadosKg += r.cantidad;
      const evitada = f[`evitada_${r.detalle?.material}`];
      if (evitada) evitadasKg += r.cantidad * evitada;
    } else if (r.subtipo === 'compostaje') {
      residuosKg += r.cantidad * f.residuo_compostaje;
      residuosValorizadosKg += r.cantidad;
    } else if (r.subtipo === 'vertedero') {
      residuosKg += r.cantidad * f.residuo_vertedero;
    } else if (r.subtipo === 'incineracion') {
      residuosKg += r.cantidad * f.residuo_incineracion;
    }
  }

  // 5 y 6. Catering y agua.
  const cateringKg = suma(porCat('catering').map((r) => r.cantidad * (f[r.subtipo] ?? 0)));
  const aguaKg = suma(porCat('agua').map((r) => r.cantidad * (f[r.subtipo] ?? 0)));

  // 7 y 8. Infraestructura y otros: medidos si existen; si no, estimados por asistente.
  const infraMedido = porCat('infraestructura');
  const infraestructuraKg = infraMedido.length
    ? suma(infraMedido.map((r) => r.cantidad))
    : base * f.infraestructura_estimada_t_por_mil;
  const otrosMedido = porCat('otros');
  const otrosKg = otrosMedido.length ? suma(otrosMedido.map((r) => r.cantidad)) : base * f.otros_estimado_t_por_mil;

  const kg = {
    transporte: transporteKg,
    alojamiento: alojamientoKg,
    energia: energiaKg,
    residuos: residuosKg,
    catering: cateringKg,
    agua: aguaKg,
    infraestructura: infraestructuraKg,
    otros: otrosKg,
  };
  const totalKg = suma(Object.values(kg));

  const estimadoKg = (infraMedido.length ? 0 : infraestructuraKg) + (otrosMedido.length ? 0 : otrosKg);
  const categorias = CATEGORIAS.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tco2e: redondear(kg[c.id] / 1000, 3),
    porcentaje: totalKg ? redondear((kg[c.id] / totalKg) * 100, 1) : 0,
    estimado: (c.id === 'infraestructura' && !infraMedido.length) || (c.id === 'otros' && !otrosMedido.length),
    sin_factor: c.id === 'alojamiento' && factorNoche === null,
  }));

  const alcance3Kg = totalKg - alcance1Kg - alcance2Kg;
  const alcances = [
    { alcance: 1, nombre: 'Alcance 1 · combustibles quemados en el evento', tco2e: redondear(alcance1Kg / 1000, 3) },
    { alcance: 2, nombre: 'Alcance 2 · electricidad comprada', tco2e: redondear(alcance2Kg / 1000, 3) },
    { alcance: 3, nombre: 'Alcance 3 · traslados, alojamiento, residuos, alimentos y otros', tco2e: redondear(alcance3Kg / 1000, 3) },
  ].map((a) => ({ ...a, porcentaje: totalKg ? redondear(((a.tco2e * 1000) / totalKg) * 100, 1) : 0 }));

  // Calidad del dato: cuánto proviene de mediciones, de extender respuestas o de estimaciones genéricas.
  const fraccionExtendida = base ? Math.max(0, 1 - registrados / base) : 0;
  const extrapoladoKg = (transporteKg + alojamientoKg) * fraccionExtendida;
  const medidoKg = Math.max(0, totalKg - estimadoKg - extrapoladoKg);
  const pct = (x) => (totalKg ? redondear((x / totalKg) * 100, 1) : 0);

  const kgPorAsistente = base ? totalKg / base : null;
  const kgSinVuelos = base ? (totalKg - vuelosKg) / base : null;
  const reciclajePct = residuosTotalKg ? (residuosValorizadosKg / residuosTotalKg) * 100 : null;
  const kwhTotal = kwhRed + kwhRenovable;
  const renovablePct = kwhTotal ? (kwhRenovable / kwhTotal) * 100 : null;

  const criterio = (meta, valor, cumple) => ({
    meta,
    valor: valor === null ? null : redondear(valor, 1),
    cumple: valor === null ? null : cumple,
  });
  const criterios = {
    kg_por_asistente_sin_vuelos: criterio(
      CRITERIOS_VERDE.max_kg_por_asistente_sin_vuelos,
      kgSinVuelos,
      kgSinVuelos !== null && kgSinVuelos <= CRITERIOS_VERDE.max_kg_por_asistente_sin_vuelos,
    ),
    reciclaje_pct: criterio(
      CRITERIOS_VERDE.min_reciclaje_pct,
      reciclajePct,
      reciclajePct !== null && reciclajePct >= CRITERIOS_VERDE.min_reciclaje_pct,
    ),
    renovable_pct: criterio(
      CRITERIOS_VERDE.min_renovable_pct,
      renovablePct,
      renovablePct !== null && renovablePct >= CRITERIOS_VERDE.min_renovable_pct,
    ),
  };

  const totalT = totalKg / 1000;
  return {
    asistentes: {
      registrados,
      base,
      estimados: Number(evento.asistentes_estimados) || null,
      reales: Number(evento.asistentes_reales) || null,
      cobertura_pct: base ? redondear((registrados / base) * 100, 1) : null,
      modos,
      noches_registradas: noches,
      noches_extendidas: redondear(nochesExtendidas, 0),
    },
    total_tco2e: redondear(totalT, 3),
    kg_por_asistente: kgPorAsistente === null ? null : redondear(kgPorAsistente, 2),
    kg_por_asistente_sin_vuelos: kgSinVuelos === null ? null : redondear(kgSinVuelos, 2),
    tco2e_por_dia: evento.dias ? redondear(totalT / evento.dias, 3) : null,
    categorias,
    alcances,
    transporte: {
      vuelos_tco2e: redondear(vuelosKg / 1000, 3),
      terrestre_tco2e: redondear(terrestreKg / 1000, 3),
    },
    residuos: {
      total_kg: redondear(residuosTotalKg, 1),
      valorizados_kg: redondear(residuosValorizadosKg, 1),
      emisiones_evitadas_tco2e: redondear(evitadasKg / 1000, 3),
    },
    energia: { kwh_red: kwhRed, kwh_renovable: kwhRenovable },
    calidad: { medido_pct: pct(medidoKg), extendido_pct: pct(extrapoladoKg), estimado_pct: pct(estimadoKg) },
    criterios,
    evento_verde: Object.values(criterios).every((c) => c.cumple === true),
    datos_completos: {
      transporte: registrados > 0,
      alojamiento: factorNoche !== null,
      energia: porCat('energia').length > 0,
      residuos: porCat('residuos').length > 0,
      catering: porCat('catering').length > 0,
      agua: porCat('agua').length > 0,
      infraestructura: infraMedido.length > 0,
      otros: otrosMedido.length > 0,
    },
    equivalencias: {
      arboles_un_anio: Math.round(totalT / 0.021),
      autos_un_anio: redondear(totalT / 4.6, 1),
    },
  };
}
