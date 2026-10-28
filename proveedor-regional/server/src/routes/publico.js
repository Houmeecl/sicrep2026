import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { asincrono, ErrorHttp } from '../lib/http.js';
import { CIUDADES, MODOS, MODOS_LOCALES, PERFILES } from '../lib/factores.js';

export const rutasPublico = Router();

// En un evento casi todos comparten el WiFi del recinto (una sola IP pública), así que el límite por IP
// es alto y solo frena abusos masivos. El límite fino es por correo y evento.
const limitePorIp = rateLimit({
  windowMs: 60 * 1000,
  limit: config.limiteRegistrosPorIp,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Hay demasiados registros desde esta red en este momento. Intenta en un minuto.' },
});

const limitePorCorreo = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `${req.params.slug}:${email}` : `${req.params.slug}:ip:${ipKeyGenerator(req.ip)}`;
  },
  message: { error: 'Ya recibimos varios registros con este correo. Espera unos minutos.' },
});

async function eventoPorSlug(slug) {
  const { rows } = await query(
    `SELECT id, slug, nombre, ciudad, recinto, fecha_inicio, fecha_fin, registro_abierto, estado
     FROM eventos WHERE slug = $1`,
    [slug],
  );
  if (!rows[0]) throw new ErrorHttp(404, 'Evento no encontrado.');
  return rows[0];
}

const ORIGENES_AGRUPADOS = Object.entries(
  CIUDADES.reduce((g, c) => {
    (g[c.grupo] ||= []).push({ id: c.id, nombre: c.nombre });
    return g;
  }, {}),
).map(([grupo, ciudades]) => ({ grupo, ciudades }));

rutasPublico.get(
  '/eventos/:slug',
  asincrono(async (req, res) => {
    const { id, estado, ...evento } = await eventoPorSlug(req.params.slug);
    res.json({
      evento: { ...evento, registro_abierto: evento.registro_abierto && estado !== 'cerrado' },
      opciones: { origenes: ORIGENES_AGRUPADOS, modos: MODOS, modos_locales: MODOS_LOCALES, perfiles: PERFILES },
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
    origen: z.enum(CIUDADES.map((c) => c.id), { message: 'Elige desde dónde viajas.' }),
    modo: z.enum(MODOS.map((m) => m.id), { message: 'Elige cómo llegaste.' }),
    modo_local: z.enum(MODOS_LOCALES.map((m) => m.id)).nullable().optional(),
    ocupantes: z.coerce.number().int().min(1).max(8).default(1),
    noches: z.coerce.number().int().min(0).max(30).default(0),
    consentimiento: z.literal(true, { message: 'Debes aceptar el tratamiento de datos para registrarte.' }),
    acepta_comunicaciones: z.boolean().optional().default(false),
  })
  .strict();

rutasPublico.post(
  '/eventos/:slug/registro',
  limitePorIp,
  limitePorCorreo,
  asincrono(async (req, res) => {
    const evento = await eventoPorSlug(req.params.slug);
    if (!evento.registro_abierto || evento.estado === 'cerrado') {
      throw new ErrorHttp(409, 'El registro de este evento está cerrado.');
    }
    const d = esquemaRegistro.parse(req.body);
    const ocupantes = d.modo === 'auto' ? d.ocupantes : 1;
    const modoLocal = d.modo === 'avion' ? d.modo_local ?? null : null;
    // Si el correo ya está registrado en el evento, se actualizan sus respuestas.
    const { rows } = await query(
      `INSERT INTO asistentes
         (evento_id, nombre, email, organizacion, perfil, origen, modo, modo_local, ocupantes, noches,
          consentimiento_version, acepta_comunicaciones)
       VALUES ($1, $2, lower($3), NULLIF($4, ''), $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (evento_id, lower(email)) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         organizacion = EXCLUDED.organizacion,
         perfil = EXCLUDED.perfil,
         origen = EXCLUDED.origen,
         modo = EXCLUDED.modo,
         modo_local = EXCLUDED.modo_local,
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
        modoLocal,
        ocupantes,
        d.noches,
        config.consentimientoVersion,
        d.acepta_comunicaciones,
      ],
    );
    res.status(rows[0].nuevo ? 201 : 200).json({ ok: true, actualizado: !rows[0].nuevo });
  }),
);
