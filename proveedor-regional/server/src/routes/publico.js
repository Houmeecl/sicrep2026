import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { asincrono, ErrorHttp } from '../lib/http.js';
import { ORIGENES, MODOS, PERFILES } from '../lib/factores.js';

export const rutasPublico = Router();

const limiteRegistro = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados registros desde esta conexión. Espera un minuto.' },
});

async function eventoPorSlug(slug) {
  const { rows } = await query(
    `SELECT id, slug, nombre, ciudad, recinto, fecha_inicio, fecha_fin, registro_abierto
     FROM eventos WHERE slug = $1`,
    [slug],
  );
  if (!rows[0]) throw new ErrorHttp(404, 'Evento no encontrado.');
  return rows[0];
}

rutasPublico.get(
  '/eventos/:slug',
  asincrono(async (req, res) => {
    const evento = await eventoPorSlug(req.params.slug);
    const { id, ...publico } = evento;
    res.json({
      evento: publico,
      opciones: {
        origenes: ORIGENES.map(({ id: oid, nombre }) => ({ id: oid, nombre })),
        modos: MODOS,
        perfiles: PERFILES,
      },
      consentimiento_version: config.consentimientoVersion,
    });
  }),
);

const esquemaRegistro = z
  .object({
    nombre: z.string().trim().min(2, 'Ingresa tu nombre.').max(120),
    email: z.string().trim().email('Ingresa un correo válido.').max(200),
    organizacion: z.string().trim().max(160).optional().default(''),
    perfil: z.enum(PERFILES, { message: 'Elige cómo participas.' }),
    origen: z.enum(ORIGENES.map((o) => o.id), { message: 'Elige desde dónde viajas.' }),
    modo: z.enum(MODOS.map((m) => m.id), { message: 'Elige cómo llegaste.' }),
    ocupantes: z.coerce.number().int().min(1).max(8).default(1),
    noches: z.coerce.number().int().min(0).max(30).default(0),
    consentimiento: z.literal(true, { message: 'Debes aceptar el tratamiento de datos para registrarte.' }),
    acepta_comunicaciones: z.boolean().optional().default(false),
  })
  .strict();

rutasPublico.post(
  '/eventos/:slug/registro',
  limiteRegistro,
  asincrono(async (req, res) => {
    const evento = await eventoPorSlug(req.params.slug);
    if (!evento.registro_abierto) throw new ErrorHttp(409, 'El registro de este evento está cerrado.');
    const d = esquemaRegistro.parse(req.body);
    const ocupantes = d.modo === 'auto' ? d.ocupantes : 1;
    // Si el correo ya está registrado en el evento, se actualizan sus respuestas.
    const { rows } = await query(
      `INSERT INTO asistentes
         (evento_id, nombre, email, organizacion, perfil, origen, modo, ocupantes, noches,
          consentimiento_version, acepta_comunicaciones)
       VALUES ($1, $2, lower($3), NULLIF($4, ''), $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (evento_id, lower(email)) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         organizacion = EXCLUDED.organizacion,
         perfil = EXCLUDED.perfil,
         origen = EXCLUDED.origen,
         modo = EXCLUDED.modo,
         ocupantes = EXCLUDED.ocupantes,
         noches = EXCLUDED.noches,
         consentimiento_version = EXCLUDED.consentimiento_version,
         consentimiento_en = now(),
         acepta_comunicaciones = EXCLUDED.acepta_comunicaciones,
         actualizado_en = now()
       RETURNING (xmax = 0) AS nuevo`,
      [
        evento.id,
        d.nombre,
        d.email,
        d.organizacion,
        d.perfil,
        d.origen,
        d.modo,
        ocupantes,
        d.noches,
        config.consentimientoVersion,
        d.acepta_comunicaciones,
      ],
    );
    res.status(rows[0].nuevo ? 201 : 200).json({ ok: true, actualizado: !rows[0].nuevo });
  }),
);
