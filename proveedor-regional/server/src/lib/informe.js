// Informe PDF de huella de carbono de un evento, generado desde un snapshot congelado.
import PDFDocument from 'pdfkit';
import { MODOS, META_FACTORES } from './factores.js';

const AZUL = '#0D2C47';
const AZUL_MEDIO = '#134B7A';
const COBRE = '#9A5225';
const GRIS = '#4A5A6A';
const VERDE = '#14532D';
const AMBAR = '#8A4A0C';

// Las fuentes estándar de PDF no tienen algunos símbolos; se reemplazan por equivalentes legibles.
const limpiar = (t) =>
  String(t ?? '')
    .replace(/≈/g, 'aprox.')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/₂/g, '2')
    .replace(/↔/g, '-')
    .replace(/³/g, '3');

const num = (n, dec = 1) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function fechaEvento(e) {
  if (!e.fecha_inicio) return 'Fecha por definir';
  return e.fecha_fin && e.fecha_fin !== e.fecha_inicio ? `${e.fecha_inicio} al ${e.fecha_fin}` : e.fecha_inicio;
}

function titulo(doc, texto) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(0.8);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text(limpiar(texto), 50);
  doc.moveDown(0.4);
}

function fila(doc, izq, der, { negrita = false, color = AZUL } = {}) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  const y = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor(AZUL).text(limpiar(izq), 50, y, { width: 330 });
  const alto = doc.y - y;
  doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fillColor(color).text(limpiar(der), 385, y, { width: 160, align: 'right' });
  doc.y = y + Math.max(alto, 14) + 3;
}

/**
 * @param {object} s     snapshot: { numero, emitido_en, emitido_por, evento, metodologia, factores, resultado }
 * @param {string|null} hash  SHA-256 del snapshot (null en borradores)
 */
export function generarInforme(s, hash, stream) {
  const { evento, resultado: r } = s;
  const borrador = !s.numero;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: limpiar(`Informe de huella — ${evento.nombre}`), Author: 'Proveedor Regional · Fundación Entretodos' },
  });
  doc.pipe(stream);
  const ancho = doc.page.width - 100;

  // Encabezado
  doc.rect(0, 0, doc.page.width, 128).fill(AZUL);
  doc.fillColor('#F2B48A').font('Helvetica-Bold').fontSize(9)
    .text('PROVEEDOR REGIONAL · INFORME DE HUELLA DE CARBONO', 50, 34, { characterSpacing: 1 });
  doc.fillColor('#FFFFFF').fontSize(20).text(limpiar(evento.nombre), 50, 52, { width: ancho });
  doc.font('Helvetica').fontSize(10).fillColor('#D7E2EC')
    .text(limpiar(`${evento.ciudad}${evento.recinto ? ' · ' + evento.recinto : ''} · ${fechaEvento(evento)}`), 50, doc.y + 3);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(borrador ? '#F2B48A' : '#FFFFFF')
    .text(borrador ? 'BORRADOR · cifras provisorias, sin número de informe' : `Informe N° ${s.numero}`, 50, doc.y + 3);

  // Indicadores principales
  const kpis = [
    ['Huella total', `${num(r.total_tco2e, 2)} tCO2e`],
    ['Por asistente', `${num(r.kg_por_asistente, 1)} kgCO2e`],
    ['Sin vuelos, por asistente', `${num(r.kg_por_asistente_sin_vuelos, 1)} kgCO2e`],
    ['Asistentes considerados', num(r.asistentes.base, 0)],
  ];
  const anchoKpi = ancho / kpis.length;
  kpis.forEach(([t, v], i) => {
    const x = 50 + i * anchoKpi;
    doc.roundedRect(x, 150, anchoKpi - 8, 60, 6).fill('#F5EFE6');
    doc.fillColor(GRIS).font('Helvetica').fontSize(8).text(t, x + 10, 159, { width: anchoKpi - 26 });
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(12).text(v, x + 10, 183, { width: anchoKpi - 26 });
  });
  doc.y = 222;
  doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(
    `Registrados: ${num(r.asistentes.registrados, 0)} (${num(r.asistentes.cobertura_pct, 0)} % de los asistentes). `
      + `Calidad del dato: ${num(r.calidad.medido_pct, 0)} % medido o declarado, ${num(r.calidad.extendido_pct, 0)} % `
      + `extendido desde respuestas de asistentes, ${num(r.calidad.estimado_pct, 0)} % estimado.`,
    50, doc.y, { width: ancho },
  );

  // Alcances
  titulo(doc, 'Huella por alcance (GHG Protocol, perspectiva del organizador)');
  for (const a of r.alcances) fila(doc, a.nombre, `${num(a.tco2e, 2)} t · ${num(a.porcentaje, 0)} %`, { negrita: true });

  // Categorías
  titulo(doc, 'Huella por categoría');
  const maxPct = Math.max(...r.categorias.map((c) => c.porcentaje), 1);
  for (const c of r.categorias) {
    if (doc.y > doc.page.height - 80) doc.addPage();
    const y = doc.y;
    const etiqueta = `${c.nombre}${c.estimado ? ' (estimado)' : ''}${c.sin_factor ? ' (sin factor)' : ''}`;
    doc.font('Helvetica').fontSize(10).fillColor(AZUL).text(etiqueta, 50, y, { width: 190 });
    doc.rect(245, y + 2, 180, 9).fill('#EEF1F4');
    doc.rect(245, y + 2, Math.max(1, (c.porcentaje / maxPct) * 180), 9).fill(AZUL_MEDIO);
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(10)
      .text(`${num(c.tco2e, 2)} t · ${num(c.porcentaje, 0)} %`, 435, y, { width: 110, align: 'right' });
    doc.y = y + 20;
  }
  fila(doc, 'De transporte: vuelos', `${num(r.transporte.vuelos_tco2e, 2)} t`);
  fila(doc, 'De transporte: terrestre y traslados al aeropuerto', `${num(r.transporte.terrestre_tco2e, 2)} t`);

  // Criterios
  titulo(doc, 'Criterios Evento Verde (autoevaluación KONTAX Events)');
  const crit = [
    [`Huella sin vuelos: máximo ${r.criterios.kg_por_asistente_sin_vuelos.meta} kgCO2e por asistente`, r.criterios.kg_por_asistente_sin_vuelos, ' kg'],
    [`Reciclaje y compostaje: mínimo ${r.criterios.reciclaje_pct.meta} %`, r.criterios.reciclaje_pct, ' %'],
    [`Electricidad renovable: mínimo ${r.criterios.renovable_pct.meta} %`, r.criterios.renovable_pct, ' %'],
  ];
  for (const [texto, c, u] of crit) {
    const estado = c.cumple === null ? 'Sin datos' : c.cumple ? 'Cumple' : 'No cumple';
    fila(doc, texto, `${c.valor === null ? '—' : num(c.valor, 1) + u} · ${estado}`, {
      negrita: true,
      color: c.cumple === null ? GRIS : c.cumple ? VERDE : AMBAR,
    });
  }
  doc.font('Helvetica-Bold').fontSize(10).fillColor(r.evento_verde ? VERDE : AMBAR)
    .text(r.evento_verde ? 'El evento cumple los tres criterios.' : 'El evento no cumple todos los criterios.', 50);
  doc.font('Helvetica').fontSize(8.5).fillColor(GRIS)
    .text('Evento Verde es un criterio de autoevaluación de la metodología KONTAX Events; no es una certificación de tercera parte.', 50, doc.y + 2, { width: ancho });

  // Transporte
  titulo(doc, 'Cómo llegaron los asistentes registrados');
  const totalModos = Object.values(r.asistentes.modos).reduce((a, b) => a + b, 0) || 1;
  for (const m of MODOS) {
    const n = r.asistentes.modos[m.id] || 0;
    fila(doc, m.nombre, `${n} · ${num((n / totalModos) * 100, 0)} %`);
  }

  // Otros indicadores
  titulo(doc, 'Otros indicadores');
  fila(doc, 'Residuos gestionados', `${num(r.residuos.total_kg, 0)} kg`);
  fila(doc, 'Residuos reciclados o compostados', `${num(r.residuos.valorizados_kg, 0)} kg`);
  fila(doc, 'Emisiones evitadas por reciclaje (informadas aparte, no descontadas)', `${num(r.residuos.emisiones_evitadas_tco2e, 2)} t`);
  fila(doc, 'Noches de alojamiento (extendidas al total)', num(r.asistentes.noches_extendidas, 0));
  if (evento.factor_alojamiento_kg_noche !== null && evento.factor_alojamiento_kg_noche !== undefined) {
    fila(doc, `Factor de alojamiento: ${evento.fuente_factor_alojamiento}`, `${num(evento.factor_alojamiento_kg_noche, 2)} kg/noche`);
  } else {
    fila(doc, 'Alojamiento', 'No incluido: sin factor');
  }

  // Anexo: factores
  doc.addPage();
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text('Anexo · Metodología y factores utilizados', 50, 50);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9).fillColor(GRIS).text(
    limpiar(`${s.metodologia.nombre} · versión ${s.metodologia.version}. ${s.metodologia.estado}`),
    { width: ancho },
  );
  doc.moveDown(0.4);
  doc.text(
    limpiar(
      'Transporte: ida y vuelta entre la ciudad de origen declarada y la sede, con distancia en línea recta entre '
        + 'coordenadas aproximadas, ajustada por sinuosidad vial o por desvíos de ruta aérea. A quienes llegan en avión se suma '
        + `el traslado aeropuerto - evento (${num(evento.km_aeropuerto, 0)} km por tramo). Las respuestas de los registrados se `
        + 'extienden al total de asistentes. Las categorías estimadas usan valores por asistente cuando no hay mediciones.',
    ),
    { width: ancho, align: 'justify' },
  );
  doc.moveDown(0.6);
  // Mismo orden que la definición de factores (el JSONB guardado no conserva el orden de las claves).
  const orden = Object.keys(META_FACTORES);
  const claves = Object.keys(s.factores).sort((a, b) => {
    const ia = orden.indexOf(a);
    const ib = orden.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });
  for (const clave of claves) {
    const f = s.factores[clave];
    if (doc.y > doc.page.height - 70) doc.addPage();
    const y = doc.y;
    let fondo = y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(AZUL).text(clave, 50, y, { width: 145 });
    fondo = Math.max(fondo, doc.y);
    doc.font('Helvetica').text(`${num(f.valor, 3)} ${limpiar(f.unidad)}`, 200, y, { width: 110 });
    fondo = Math.max(fondo, doc.y);
    doc.fillColor(GRIS).text(limpiar(f.fuente), 315, y, { width: 230 });
    fondo = Math.max(fondo, doc.y);
    doc.y = fondo + 4;
  }

  // Cierre
  doc.moveDown(1);
  if (doc.y > doc.page.height - 110) doc.addPage();
  doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(
    'Este informe es una estimación de gestión y no constituye una verificación de tercera parte.',
    50, doc.y, { width: ancho },
  );
  if (!borrador) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fillColor(AZUL).text(`Informe N° ${s.numero} · emitido el ${new Date(s.emitido_en).toLocaleString('es-CL', { timeZone: 'America/Santiago' })} por ${limpiar(s.emitido_por)}`);
    doc.font('Courier').fontSize(7.5).fillColor(GRIS).text(`Huella digital SHA-256 del contenido: ${hash}`, { width: ancho });
  }

  doc.end();
}
