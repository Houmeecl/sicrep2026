// Informe PDF de huella de carbono de un evento.
import PDFDocument from 'pdfkit';
import { MODOS, CRITERIOS_VERDE } from './factores.js';

const AZUL = '#0D2C47';
const AZUL_MEDIO = '#134B7A';
const COBRE = '#9A5225';
const GRIS = '#4A5A6A';
const VERDE = '#14532D';
const AMBAR = '#8A4A0C';

const num = (n, dec = 1) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec });

function fechaEvento(e) {
  if (!e.fecha_inicio) return 'Fecha por definir';
  return e.fecha_fin && e.fecha_fin !== e.fecha_inicio ? `${e.fecha_inicio} al ${e.fecha_fin}` : e.fecha_inicio;
}

export function generarInforme(evento, r, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Informe de huella — ${evento.nombre}` } });
  doc.pipe(stream);
  const ancho = doc.page.width - 100;

  // Encabezado
  doc.rect(0, 0, doc.page.width, 120).fill(AZUL);
  doc.fillColor('#F2B48A').font('Helvetica-Bold').fontSize(9).text('PROVEEDOR REGIONAL · INFORME DE HUELLA DE CARBONO', 50, 36, { characterSpacing: 1 });
  doc.fillColor('#FFFFFF').fontSize(20).text(evento.nombre, 50, 54, { width: ancho });
  doc.font('Helvetica').fontSize(10).fillColor('#D7E2EC')
    .text(`${evento.ciudad}${evento.recinto ? ' · ' + evento.recinto : ''} · ${fechaEvento(evento)}`, 50, doc.y + 4);

  doc.y = 145;
  doc.fillColor(AZUL);

  // Indicadores principales
  const kpis = [
    ['Huella total', `${num(r.total_tco2e, 2)} tCO2e`],
    ['Por asistente', `${num(r.kg_por_asistente, 1)} kgCO2e`],
    ['Asistentes considerados', num(r.asistentes.base, 0)],
    ['Registrados', `${num(r.asistentes.registrados, 0)} (${num(r.asistentes.cobertura_pct, 0)} %)`],
  ];
  const anchoKpi = ancho / kpis.length;
  kpis.forEach(([t, v], i) => {
    const x = 50 + i * anchoKpi;
    doc.roundedRect(x, 145, anchoKpi - 8, 58, 6).fill('#F5EFE6');
    doc.fillColor(GRIS).font('Helvetica').fontSize(8).text(t, x + 10, 154, { width: anchoKpi - 26 });
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text(v, x + 10, 170, { width: anchoKpi - 26 });
  });

  // Desglose por categoría
  doc.y = 225;
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text('Huella por categoría', 50);
  doc.moveDown(0.5);
  const maxPct = Math.max(...r.categorias.map((c) => c.porcentaje), 1);
  for (const c of r.categorias) {
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(AZUL)
      .text(`${c.nombre}${c.estimado ? ' (estimado)' : ''}`, 50, y, { width: 190 });
    doc.rect(245, y + 2, 180, 9).fill('#EEF1F4');
    doc.rect(245, y + 2, Math.max(1, (c.porcentaje / maxPct) * 180), 9).fill(AZUL_MEDIO);
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(10)
      .text(`${num(c.tco2e, 2)} t · ${num(c.porcentaje, 0)} %`, 435, y, { width: 110, align: 'right' });
    doc.y = y + 20;
  }

  // Criterios Evento Verde
  doc.moveDown(0.8);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text('Criterios Evento Verde', 50);
  doc.moveDown(0.4);
  const filas = [
    [`Huella máxima de ${CRITERIOS_VERDE.max_kg_por_asistente} kgCO2e por asistente`, r.criterios.kg_por_asistente, ' kg'],
    [`Reciclaje y compostaje mínimo ${CRITERIOS_VERDE.min_reciclaje_pct} %`, r.criterios.reciclaje_pct, ' %'],
    [`Electricidad renovable mínima ${CRITERIOS_VERDE.min_renovable_pct} %`, r.criterios.renovable_pct, ' %'],
  ];
  for (const [texto, c, unidad] of filas) {
    const y = doc.y;
    const estado = c.cumple === null ? 'Sin datos' : c.cumple ? 'Cumple' : 'No cumple';
    const color = c.cumple === null ? GRIS : c.cumple ? VERDE : AMBAR;
    doc.font('Helvetica').fontSize(10).fillColor(AZUL).text(texto, 50, y, { width: 280 });
    doc.text(c.valor === null ? '—' : `${num(c.valor, 1)}${unidad}`, 335, y, { width: 90, align: 'right' });
    doc.font('Helvetica-Bold').fillColor(color).text(estado, 435, y, { width: 110, align: 'right' });
    doc.y = y + 18;
  }
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(r.evento_verde ? VERDE : AMBAR)
    .text(r.evento_verde ? 'El evento cumple los criterios de Evento Verde.' : 'El evento aún no cumple todos los criterios de Evento Verde.', 50);

  // Transporte
  doc.moveDown(0.8);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text('Cómo llegaron los asistentes registrados', 50);
  doc.moveDown(0.4);
  const totalModos = Object.values(r.asistentes.modos).reduce((a, b) => a + b, 0) || 1;
  for (const m of MODOS) {
    const n = r.asistentes.modos[m.id] || 0;
    const y = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor(AZUL).text(m.nombre, 50, y, { width: 280 });
    doc.text(`${n} · ${num((n / totalModos) * 100, 0)} %`, 335, y, { width: 210, align: 'right' });
    doc.y = y + 16;
  }

  // Otros datos
  doc.moveDown(0.8);
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13).text('Otros indicadores', 50);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10).fillColor(AZUL);
  doc.text(`Residuos gestionados: ${num(r.residuos.total_kg, 0)} kg, de los cuales ${num(r.residuos.valorizados_kg, 0)} kg se reciclaron o compostaron.`);
  doc.text(`Emisiones evitadas por reciclaje (informadas aparte, no descontadas): ${num(r.residuos.emisiones_evitadas_tco2e, 2)} tCO2e.`);
  doc.text(`Equivalencia: la huella total equivale a la absorción anual de unos ${num(r.equivalencias.arboles_un_anio, 0)} árboles.`);
  if (!r.alojamiento_incluido) {
    doc.text(`Noches de alojamiento declaradas: ${num(r.asistentes.noches_registradas, 0)} (no incluidas en el total: sin factor validado).`);
  }

  // Metodología
  doc.moveDown(0.8);
  doc.fillColor(COBRE).font('Helvetica-Bold').fontSize(10).text('Metodología y alcance', 50);
  doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(
    'Cálculo según la metodología KONTAX Events con factores de emisión Chile 2026. El transporte considera ida y vuelta '
    + 'desde la ciudad de origen declarada por cada asistente, con distancias aproximadas, y se extiende al total de asistentes '
    + 'a partir del promedio de los registrados. Las categorías marcadas como estimadas usan valores por asistente cuando no hay '
    + 'mediciones. Este informe es una estimación de gestión y no constituye una verificación de tercera parte.',
    { width: ancho, align: 'justify' },
  );

  doc.font('Helvetica').fontSize(8).fillColor(GRIS)
    .text(`Generado el ${new Date().toLocaleDateString('es-CL')} · Proveedor Regional · Fundación Entretodos`, 50, doc.page.height - 60, { width: ancho, align: 'center' });

  doc.end();
}
