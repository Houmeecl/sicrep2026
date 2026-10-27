import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { asincrono, ErrorHttp, validarUuid } from '../lib/http.js';
import { requiereRol } from '../lib/auth.js';
import { calcularHuella } from '../lib/calculadora.js';
import { aCsv } from '../lib/csv.js';
import { generarInforme } from '../lib/informe.js';
import {
  SUBTIPOS,
  MATERIALES_RESIDUO,
  ORIGENES,
  MODOS,
  CATEGORIAS,
  CRITERIOS_VERDE,
} from '../lib/factores.js';

export const rutasEventos = Router();
rutasEventos.use(requiereRol('admin', 'sostenibilidad'));

const NOMBRE_ORIGEN = Object.fromEntries(ORIGENES.map((o) => [o.id, o.nombre]));
const NOMBRE_MODO = Object.fromEntries(MODOS.map((m) => [m.id, m.nombre]));

function crearSlug(nombre) {
  const base = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'evento'}-${crypto.randomBytes(3).toString('hex')}`;
}

async function obtenerEvento(id) {
  const { rows } = await query('SELECT * FROM eventos WHERE id = $1', [validarUuid(id)]);
  if (!rows[0]) throw new ErrorHttp(404, 'Evento no encontrado.');
  return rows[0];
}

async function resultadoEvento(evento) {
  const [asistentes, registros] = await Promise.all([
    query('SELECT origen, modo, ocupantes, noches FROM asistentes WHERE evento_id = $1', [evento.id]),
    query('SELECT categoria, subtipo, cantidad, detalle FROM registros_operativos WHERE evento_id = $1', [evento.id]),
  ]);
  return calcularHuella({ evento, asistentes: asistentes.rows, registros: registros.rows });
}

const urlRegistro = (slug) => `${config.publicUrl}/r/${slug}`;

// Catálogos para los formularios de captura.
rutasEventos.get('/catalogos', (_req, res) => {
  res.json({ subtipos: SUBTIPOS, materiales: MATERIALES_RESIDUO, categorias: CATEGORIAS, criterios: CRITERIOS_VERDE });
});

rutasEventos.get(
  '/',
  asincrono(async (_req, res) => {
    const { rows } = await query(
      `SELECT e.id, e.slug, e.nombre, e.ciudad, e.recinto, e.fecha_inicio, e.fecha_fin, e.estado,
              e.registro_abierto, e.asistentes_estimados,
              (SELECT count(*)::int FROM asistentes a WHERE a.evento_id = e.id) AS registrados
       FROM eventos e ORDER BY e.fecha_inicio DESC NULLS LAST, e.creado_en DESC`,
    );
    res.json({ eventos: rows });
  }),
);

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD.')
  .nullable()
  .optional();

const esquemaEvento = z.object({
  nombre: z.string().trim().min(3, 'Ingresa el nombre del evento.').max(160),
  tipo: z.enum(['conferencia', 'feria', 'formacion', 'encuentro', 'otro']),
  ciudad: z.string().trim().min(2).max(80),
  recinto: z.string().trim().max(160).nullable().optional(),
  fecha_inicio: fecha,
  fecha_fin: fecha,
  dias: z.coerce.number().int().min(1).max(60),
  asistentes_estimados: z.coerce.number().int().min(0).max(500000).nullable().optional(),
  asistentes_reales: z.coerce.number().int().min(0).max(500000).nullable().optional(),
  estado: z.enum(['planificacion', 'en_curso', 'finalizado']),
  registro_abierto: z.boolean(),
});

// Al crear se aplican valores por defecto; al editar (partial) solo cambian los campos enviados.
const esquemaEventoNuevo = esquemaEvento.partial().required({ nombre: true });
const DEFECTOS_EVENTO = { tipo: 'conferencia', ciudad: 'Antofagasta', dias: 1, estado: 'planificacion', registro_abierto: true };

rutasEventos.post(
  '/',
  asincrono(async (req, res) => {
    const d = { ...DEFECTOS_EVENTO, ...esquemaEventoNuevo.parse(req.body) };
    const { rows } = await query(
      `INSERT INTO eventos (slug, nombre, tipo, ciudad, recinto, fecha_inicio, fecha_fin, dias,
         asistentes_estimados, asistentes_reales, estado, registro_abierto, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        crearSlug(d.nombre), d.nombre, d.tipo, d.ciudad, d.recinto ?? null, d.fecha_inicio ?? null,
        d.fecha_fin ?? null, d.dias, d.asistentes_estimados ?? null, d.asistentes_reales ?? null,
        d.estado, d.registro_abierto, req.usuario.id,
      ],
    );
    res.status(201).json({ evento: rows[0] });
  }),
);

rutasEventos.get(
  '/:id',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    res.json({ evento, url_registro: urlRegistro(evento.slug), resultado: await resultadoEvento(evento) });
  }),
);

rutasEventos.patch(
  '/:id',
  asincrono(async (req, res) => {
    const actual = await obtenerEvento(req.params.id);
    const d = esquemaEvento.partial().parse(req.body);
    const campos = Object.keys(d);
    if (!campos.length) return res.json({ evento: actual });
    const sets = campos.map((c, i) => `${c} = $${i + 2}`);
    const { rows } = await query(
      `UPDATE eventos SET ${sets.join(', ')}, actualizado_en = now() WHERE id = $1 RETURNING *`,
      [actual.id, ...campos.map((c) => d[c] ?? null)],
    );
    res.json({ evento: rows[0] });
  }),
);

rutasEventos.delete(
  '/:id',
  requiereRol('admin'),
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    await query('DELETE FROM eventos WHERE id = $1', [evento.id]);
    res.json({ ok: true });
  }),
);

// QR que lleva al formulario público de registro.
rutasEventos.get(
  '/:id/qr.png',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const png = await QRCode.toBuffer(urlRegistro(evento.slug), {
      width: 720,
      margin: 2,
      color: { dark: '#0D2C47', light: '#FFFFFF' },
    });
    res.type('png').set('Content-Disposition', `inline; filename="qr-${evento.slug}.png"`).send(png);
  }),
);

// ---- Asistentes ----

rutasEventos.get(
  '/:id/asistentes',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rows } = await query(
      `SELECT id, nombre, email, organizacion, perfil, origen, modo, ocupantes, noches,
              acepta_comunicaciones, creado_en
       FROM asistentes WHERE evento_id = $1 ORDER BY creado_en DESC`,
      [evento.id],
    );
    res.json({ asistentes: rows });
  }),
);

rutasEventos.get(
  '/:id/asistentes.csv',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rows } = await query(
      `SELECT * FROM asistentes WHERE evento_id = $1 ORDER BY creado_en`,
      [evento.id],
    );
    const csv = aCsv(
      [
        { titulo: 'Nombre', valor: (a) => a.nombre },
        { titulo: 'Correo', valor: (a) => a.email },
        { titulo: 'Organización', valor: (a) => a.organizacion },
        { titulo: 'Participa como', valor: (a) => a.perfil },
        { titulo: 'Origen', valor: (a) => NOMBRE_ORIGEN[a.origen] || a.origen },
        { titulo: 'Traslado', valor: (a) => NOMBRE_MODO[a.modo] || a.modo },
        { titulo: 'Ocupantes del auto', valor: (a) => (a.modo === 'auto' ? a.ocupantes : '') },
        { titulo: 'Noches de alojamiento', valor: (a) => a.noches },
        { titulo: 'Acepta comunicaciones', valor: (a) => (a.acepta_comunicaciones ? 'Sí' : 'No') },
        { titulo: 'Versión consentimiento', valor: (a) => a.consentimiento_version },
        { titulo: 'Fecha de registro', valor: (a) => a.creado_en.toISOString() },
      ],
      rows,
    );
    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="asistentes-${evento.slug}.csv"`)
      .send(csv);
  }),
);

// Supresión de los datos de un asistente (derecho de supresión).
rutasEventos.delete(
  '/:id/asistentes/:aid',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rowCount } = await query('DELETE FROM asistentes WHERE id = $1 AND evento_id = $2', [
      validarUuid(req.params.aid),
      evento.id,
    ]);
    if (!rowCount) throw new ErrorHttp(404, 'Asistente no encontrado.');
    res.json({ ok: true });
  }),
);

// ---- Datos operativos ----

rutasEventos.get(
  '/:id/registros',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rows } = await query(
      `SELECT r.id, r.categoria, r.subtipo, r.cantidad, r.detalle, r.nota, r.creado_en, u.nombre AS creado_por
       FROM registros_operativos r LEFT JOIN usuarios u ON u.id = r.creado_por
       WHERE r.evento_id = $1 ORDER BY r.creado_en DESC`,
      [evento.id],
    );
    res.json({ registros: rows });
  }),
);

const esquemaRegistro = z
  .object({
    categoria: z.enum(Object.keys(SUBTIPOS)),
    subtipo: z.string(),
    cantidad: z.coerce.number().min(0, 'La cantidad no puede ser negativa.').max(1e9),
    material: z.enum(Object.keys(MATERIALES_RESIDUO)).optional(),
    nota: z.string().trim().max(300).optional(),
  })
  .refine((d) => SUBTIPOS[d.categoria]?.[d.subtipo], { message: 'Tipo de dato no válido para la categoría.', path: ['subtipo'] });

rutasEventos.post(
  '/:id/registros',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const d = esquemaRegistro.parse(req.body);
    const detalle = d.categoria === 'residuos' ? { material: d.material || 'mixto' } : {};
    const { rows } = await query(
      `INSERT INTO registros_operativos (evento_id, categoria, subtipo, cantidad, detalle, nota, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [evento.id, d.categoria, d.subtipo, d.cantidad, detalle, d.nota || null, req.usuario.id],
    );
    res.status(201).json({ registro: rows[0] });
  }),
);

rutasEventos.delete(
  '/:id/registros/:rid',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rowCount } = await query('DELETE FROM registros_operativos WHERE id = $1 AND evento_id = $2', [
      validarUuid(req.params.rid),
      evento.id,
    ]);
    if (!rowCount) throw new ErrorHttp(404, 'Registro no encontrado.');
    res.json({ ok: true });
  }),
);

// ---- Informe ----

rutasEventos.get(
  '/:id/informe.pdf',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const resultado = await resultadoEvento(evento);
    res.type('application/pdf').set('Content-Disposition', `attachment; filename="informe-${evento.slug}.pdf"`);
    generarInforme(evento, resultado, res);
  }),
);
