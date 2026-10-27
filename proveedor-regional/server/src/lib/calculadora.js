// Cálculo de huella de carbono de un evento (metodología KONTAX Events).
// Función pura: recibe datos y devuelve resultados, sin acceso a base de datos.
import {
  FACTORES,
  ORIGENES,
  CRITERIOS_VERDE,
  CATEGORIAS,
} from './factores.js';

const KM_POR_ORIGEN = Object.fromEntries(ORIGENES.map((o) => [o.id, o.km]));

function factorAvion(km, f) {
  if (km > 3500) return f.avion_internacional;
  if (km >= 1500) return f.avion_regional;
  return f.avion_domestico;
}

// Emisiones de traslado ida y vuelta de un asistente, en kgCO2e.
export function emisionesAsistente(asistente, f = FACTORES) {
  const km = KM_POR_ORIGEN[asistente.origen];
  if (km === undefined) return 0;
  const kmTotal = km * 2; // ida y vuelta
  switch (asistente.modo) {
    case 'auto': {
      const ocupantes = Math.max(1, Number(asistente.ocupantes) || 1);
      return (kmTotal * f.auto_vehiculo_km) / ocupantes;
    }
    case 'taxi':
      return kmTotal * f.auto_vehiculo_km;
    case 'bus':
      return kmTotal * f.bus_pasajero_km;
    case 'avion':
      return kmTotal * factorAvion(km, f);
    case 'activo':
    default:
      return 0;
  }
}

function suma(lista) {
  return lista.reduce((a, b) => a + b, 0);
}

function redondear(n, dec = 2) {
  const p = 10 ** dec;
  return Math.round(n * p) / p;
}

/**
 * @param {object} p
 * @param {object} p.evento        fila de eventos (asistentes_estimados, asistentes_reales, dias)
 * @param {object[]} p.asistentes  filas de asistentes (origen, modo, ocupantes, noches)
 * @param {object[]} p.registros   filas de registros_operativos (categoria, subtipo, cantidad, detalle)
 */
export function calcularHuella({ evento, asistentes, registros }, f = FACTORES) {
  const registrados = asistentes.length;
  // Asistentes considerados: los reales si ya se informaron; si no, el mayor entre registrados y estimados.
  const base = Number(evento.asistentes_reales) || Math.max(registrados, Number(evento.asistentes_estimados) || 0);

  // 1. Transporte: promedio de los registrados, extendido al total de asistentes.
  const kgPorRegistrado = registrados ? suma(asistentes.map((a) => emisionesAsistente(a, f))) / registrados : 0;
  const transporteKg = kgPorRegistrado * base;

  const modos = {};
  for (const a of asistentes) modos[a.modo] = (modos[a.modo] || 0) + 1;

  const porCat = (cat) => registros.filter((r) => r.categoria === cat);

  // 2. Energía
  let energiaKg = 0;
  let kwhRed = 0;
  let kwhRenovable = 0;
  for (const r of porCat('energia')) {
    const factor = f[r.subtipo];
    if (factor === undefined) continue;
    energiaKg += r.cantidad * factor;
    if (r.subtipo === 'electricidad_red') kwhRed += r.cantidad;
    if (r.subtipo === 'electricidad_renovable') kwhRenovable += r.cantidad;
  }

  // 3. Residuos: emisiones del destino + emisiones evitadas informadas aparte.
  let residuosKg = 0;
  let evitadasKg = 0;
  let residuosTotalKg = 0;
  let residuosValorizadosKg = 0;
  for (const r of porCat('residuos')) {
    residuosTotalKg += r.cantidad;
    if (r.subtipo === 'reciclaje') {
      residuosKg += r.cantidad * f.residuo_reciclaje_proceso;
      residuosValorizadosKg += r.cantidad;
      const material = r.detalle?.material;
      const evitada = f[`evitada_${material}`];
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

  // 4. Catering
  const cateringKg = suma(porCat('catering').map((r) => r.cantidad * (f[r.subtipo] ?? 0)));

  // 5. Agua
  const aguaKg = suma(porCat('agua').map((r) => r.cantidad * (f[r.subtipo] ?? 0)));

  // 6 y 7. Infraestructura y otros: medidos si existen; si no, estimados por asistente.
  const infraMedido = porCat('infraestructura');
  const infraestructuraKg = infraMedido.length
    ? suma(infraMedido.map((r) => r.cantidad))
    : (base / 1000) * f.infraestructura_estimada_t_por_mil * 1000;

  const otrosMedido = porCat('otros');
  let otrosKg = otrosMedido.length
    ? suma(otrosMedido.map((r) => r.cantidad))
    : (base / 1000) * f.otros_estimado_t_por_mil * 1000;

  const noches = suma(asistentes.map((a) => Number(a.noches) || 0));
  const nochesExtendidas = registrados ? (noches / registrados) * base : 0;
  if (f.alojamiento_noche) otrosKg += nochesExtendidas * f.alojamiento_noche;

  const kg = {
    transporte: transporteKg,
    energia: energiaKg,
    residuos: residuosKg,
    catering: cateringKg,
    agua: aguaKg,
    infraestructura: infraestructuraKg,
    otros: otrosKg,
  };
  const totalKg = suma(Object.values(kg));

  const categorias = CATEGORIAS.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tco2e: redondear(kg[c.id] / 1000, 3),
    porcentaje: totalKg ? redondear((kg[c.id] / totalKg) * 100, 1) : 0,
    estimado:
      (c.id === 'infraestructura' && !infraMedido.length) || (c.id === 'otros' && !otrosMedido.length),
  }));

  const kgPorAsistente = base ? totalKg / base : null;
  const reciclajePct = residuosTotalKg ? (residuosValorizadosKg / residuosTotalKg) * 100 : null;
  const kwhTotal = kwhRed + kwhRenovable;
  const renovablePct = kwhTotal ? (kwhRenovable / kwhTotal) * 100 : null;

  const criterio = (valor, cumple) => ({ valor: valor === null ? null : redondear(valor, 1), cumple: valor === null ? null : cumple });
  const criterios = {
    kg_por_asistente: {
      meta: CRITERIOS_VERDE.max_kg_por_asistente,
      ...criterio(kgPorAsistente, kgPorAsistente !== null && kgPorAsistente <= CRITERIOS_VERDE.max_kg_por_asistente),
    },
    reciclaje_pct: {
      meta: CRITERIOS_VERDE.min_reciclaje_pct,
      ...criterio(reciclajePct, reciclajePct !== null && reciclajePct >= CRITERIOS_VERDE.min_reciclaje_pct),
    },
    renovable_pct: {
      meta: CRITERIOS_VERDE.min_renovable_pct,
      ...criterio(renovablePct, renovablePct !== null && renovablePct >= CRITERIOS_VERDE.min_renovable_pct),
    },
  };
  const eventoVerde = Object.values(criterios).every((c) => c.cumple === true);

  const totalT = totalKg / 1000;
  const datos = {
    transporte: registrados > 0,
    energia: porCat('energia').length > 0,
    residuos: porCat('residuos').length > 0,
    catering: porCat('catering').length > 0,
    agua: porCat('agua').length > 0,
    infraestructura: infraMedido.length > 0,
    otros: otrosMedido.length > 0,
  };

  return {
    asistentes: {
      registrados,
      base,
      estimados: Number(evento.asistentes_estimados) || null,
      reales: Number(evento.asistentes_reales) || null,
      cobertura_pct: base ? redondear((registrados / base) * 100, 1) : null,
      modos,
      noches_registradas: noches,
    },
    total_tco2e: redondear(totalT, 3),
    kg_por_asistente: kgPorAsistente === null ? null : redondear(kgPorAsistente, 2),
    tco2e_por_dia: evento.dias ? redondear(totalT / evento.dias, 3) : null,
    categorias,
    residuos: {
      total_kg: redondear(residuosTotalKg, 1),
      valorizados_kg: redondear(residuosValorizadosKg, 1),
      emisiones_evitadas_tco2e: redondear(evitadasKg / 1000, 3),
    },
    energia: { kwh_red: kwhRed, kwh_renovable: kwhRenovable },
    criterios,
    evento_verde: eventoVerde,
    datos_completos: datos,
    equivalencias: {
      arboles_un_anio: Math.round(totalT / 0.021),
      autos_un_anio: redondear(totalT / 4.6, 1),
      hogares_un_mes_electricidad: Math.round(totalT / 0.35),
    },
    alojamiento_incluido: Boolean(f.alojamiento_noche),
  };
}
