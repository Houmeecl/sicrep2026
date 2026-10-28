import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { pool, query } from '../db/pool.js';
import { config } from '../config.js';
import { asincrono, ErrorHttp, validarUuid } from '../lib/http.js';
import { requiereRol } from '../lib/auth.js';
import { auditar } from '../lib/auditoria.js';
import { calcularHuella } from '../lib/calculadora.js';
import { hashSha256 } from '../lib/canonico.js';
import { aCsv } from '../lib/csv.js';
import { generarInforme } from '../lib/informe.js';
import {
  SUBTIPOS,
  MATERIALES_RESIDUO,
  CIUDAD_POR_ID,
  SEDES,
  MODOS,
  MODOS_LOCALES,
  CATEGORIAS,
  CRITERIOS_VERDE,
  METODOLOGIA,
  META_FACTORES,
} from '../lib/factores.js';

export const rutasEventos = Router();
rutasEventos.use(requiereRol('admin', 'sostenibilidad'));

const NOMBRE_MODO = Object.fromEntries(MODOS.map((m) => [m.id, m.nombre]));
const NOMBRE_MODO_LOCAL = Object.fromEntries(MODOS_LOCALES.map((m) => [m.id, m.nombre]));
const nombreOrigen = (id) => CIUDAD_POR_ID[id]?.nombre || id;

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

async function obtenerEvento(id, cliente = { query }) {
  const { rows } = await cliente.query('SELECT * FROM eventos WHERE id = $1', [validarUuid(id)]);
  if (!rows[0]) throw new ErrorHttp(404, 'Evento no encontrado.');
  return rows[0];
}

function exigirAbierto(evento) {
  if (evento.estado === 'cerrado') {
    throw new ErrorHttp(409, 'El evento está cerrado y su informe ya fue emitido. Un administrador puede reabrirlo.');
  }
}

async function datosEvento(evento, cliente = { query }) {
  const [asistentes, registros] = await Promise.all([
    cliente.query('SELECT origen, modo, modo_local, ocupantes, noches FROM asistentes WHERE evento_id = $1', [evento.id]),
    cliente.query(
      `SELECT categoria, subtipo, cantidad, detalle, nota FROM registros_operativos
       WHERE evento_id = $1 ORDER BY creado_en`,
      [evento.id],
    ),
  ]);
  return { asistentes: asistentes.rows, registros: registros.rows };
}

async function resultadoEvento(evento, cliente) {
  const { asistentes, registros } = await datosEvento(evento, cliente);
  return calcularHuella({ evento, asistentes, registros });
}

// Contenido congelado de un informe: datos del evento, factores y resultado. Sin datos personales.
async function armarSnapshot(evento, cliente) {
  const { asistentes, registros } = await datosEvento(evento, cliente);
  return {
    evento: {
      nombre: evento.nombre,
      ciudad: evento.ciudad,
      recinto: evento.recinto,
      fecha_inicio: evento.fecha_inicio,
      fecha_fin: evento.fecha_fin,
      dias: evento.dias,
      ciudad_base: evento.ciudad_base,
      km_aeropuerto: evento.km_aeropuerto,
      factor_alojamiento_kg_noche: evento.factor_alojamiento_kg_noche,
      fuente_factor_alojamiento: evento.fuente_factor_alojamiento,
      asistentes_estimados: evento.asistentes_estimados,
      asistentes_reales: evento.asistentes_reales,
    },
    metodologia: METODOLOGIA,
    factores: META_FACTORES,
    registros_operativos: registros,
    resultado: calcularHuella({ evento, asistentes, registros }),
  };
}

const urlRegistro = (slug) => `${config.publicUrl}/r/${slug}`;

// Catálogos para los formularios.
rutasEventos.get('/catalogos', (_req, res) => {
  res.json({
    subtipos: SUBTIPOS,
    materiales: MATERIALES_RESIDUO,
    categorias: CATEGORIAS,
    criterios: CRITERIOS_VERDE,
    sedes: SEDES.map(({ id, nombre }) => ({ id, nombre })),
    metodologia: METODOLOGIA,
    factores: META_FACTORES,
  });
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
  ciudad_base: z.enum(SEDES.map((s) => s.id), { message: 'Elige la ciudad sede para calcular distancias.' }),
  recinto: z.string().trim().max(160).nullable().optional(),
  fecha_inicio: fecha,
  fecha_fin: fecha,
  dias: z.coerce.number().int().min(1).max(60),
  asistentes_estimados: z.coerce.number().int().min(0).max(500000).nullable().optional(),
  asistentes_reales: z.coerce.number().int().min(0).max(500000).nullable().optional(),
  km_aeropuerto: z.coerce.number().min(0).max(300),
  factor_alojamiento_kg_noche: z.coerce.number().min(0).max(500).nullable().optional(),
  fuente_factor_alojamiento: z.string().trim().max(300).nullable().optional(),
  estado: z.enum(['planificacion', 'en_curso', 'finalizado'], { message: 'Para cerrar el evento usa "Cerrar y emitir informe".' }),
  registro_abierto: z.boolean(),
});

// Al crear se aplican valores por defecto; al editar (partial) solo cambian los campos enviados.
const esquemaEventoNuevo = esquemaEvento.partial().required({ nombre: true });
const DEFECTOS_EVENTO = {
  tipo: 'conferencia',
  ciudad: 'Antofagasta',
  ciudad_base: 'antofagasta',
  dias: 1,
  km_aeropuerto: 25,
  estado: 'planificacion',
  registro_abierto: true,
};

function exigirFuenteAlojamiento(d) {
  if (d.factor_alojamiento_kg_noche !== null && d.factor_alojamiento_kg_noche !== undefined && !d.fuente_factor_alojamiento) {
    throw new ErrorHttp(400, 'Indica la fuente del factor de alojamiento.');
  }
}

rutasEventos.post(
  '/',
  asincrono(async (req, res) => {
    const d = { ...DEFECTOS_EVENTO, ...esquemaEventoNuevo.parse(req.body) };
    exigirFuenteAlojamiento(d);
    const campos = Object.keys(d);
    const { rows } = await query(
      `INSERT INTO eventos (slug, creado_por, ${campos.join(', ')})
       VALUES ($1, $2, ${campos.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING *`,
      [crearSlug(d.nombre), req.usuario.id, ...campos.map((c) => d[c] ?? null)],
    );
    res.status(201).json({ evento: rows[0] });
  }),
);

rutasEventos.get(
  '/:id',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rows: informes } = await query(
      `SELECT i.id, i.numero, i.estado, i.metodologia_version, i.hash_sha256, i.emitido_en, u.nombre AS emitido_por
       FROM informes i LEFT JOIN usuarios u ON u.id = i.emitido_por
       WHERE i.evento_id = $1 ORDER BY i.emitido_en DESC`,
      [evento.id],
    );
    const vigente = informes.find((i) => i.estado === 'vigente');
    // Un evento cerrado muestra el resultado congelado del informe vigente.
    let resultado;
    if (evento.estado === 'cerrado' && vigente) {
      const { rows } = await query('SELECT snapshot FROM informes WHERE id = $1', [vigente.id]);
      resultado = rows[0].snapshot.resultado;
    } else {
      resultado = await resultadoEvento(evento);
    }
    res.json({ evento, url_registro: urlRegistro(evento.slug), resultado, informes });
  }),
);

rutasEventos.patch(
  '/:id',
  asincrono(async (req, res) => {
    const actual = await obtenerEvento(req.params.id);
    exigirAbierto(actual);
    const d = esquemaEvento.partial().parse(req.body);
    exigirFuenteAlojamiento({ ...actual, ...d });
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
    await auditar(req, 'evento.eliminar', evento.id, { nombre: evento.nombre });
    res.json({ ok: true });
  }),
);

// ---- Cierre e informes ----

rutasEventos.post(
  '/:id/cerrar',
  asincrono(async (req, res) => {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const { rows } = await cliente.query('SELECT * FROM eventos WHERE id = $1 FOR UPDATE', [validarUuid(req.params.id)]);
      const evento = rows[0];
      if (!evento) throw new ErrorHttp(404, 'Evento no encontrado.');
      exigirAbierto(evento);

      const { rows: seq } = await cliente.query("SELECT nextval('informes_numero_seq') AS n");
      const anio = new Date().getFullYear();
      const numero = `PR-HE-${anio}-${String(seq[0].n).padStart(4, '0')}`;
      const snapshot = {
        numero,
        emitido_en: new Date().toISOString(),
        emitido_por: req.usuario.nombre,
        ...(await armarSnapshot(evento, cliente)),
      };
      const hash = hashSha256(snapshot);

      const { rows: insertado } = await cliente.query(
        `INSERT INTO informes (evento_id, numero, metodologia_version, snapshot, hash_sha256, emitido_por)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, numero, hash_sha256, emitido_en`,
        [evento.id, numero, METODOLOGIA.version, snapshot, hash, req.usuario.id],
      );
      await cliente.query(
        `UPDATE eventos SET estado = 'cerrado', registro_abierto = FALSE, actualizado_en = now() WHERE id = $1`,
        [evento.id],
      );
      await auditar(req, 'informe.emitir', evento.id, { numero, hash }, cliente);
      await cliente.query('COMMIT');
      res.status(201).json({ informe: insertado[0] });
    } catch (err) {
      await cliente.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      cliente.release();
    }
  }),
);

rutasEventos.post(
  '/:id/reabrir',
  requiereRol('admin'),
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    if (evento.estado !== 'cerrado') throw new ErrorHttp(409, 'El evento no está cerrado.');
    const { rows } = await query(
      `UPDATE informes SET estado = 'reemplazado' WHERE evento_id = $1 AND estado = 'vigente' RETURNING numero`,
      [evento.id],
    );
    await query(`UPDATE eventos SET estado = 'finalizado', actualizado_en = now() WHERE id = $1`, [evento.id]);
    await auditar(req, 'evento.reabrir', evento.id, { informe_reemplazado: rows[0]?.numero ?? null });
    res.json({ ok: true });
  }),
);

function enviarPdf(res, nombreArchivo, snapshot, hash) {
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  generarInforme(snapshot, hash, res);
}

// Informe actual: el emitido si el evento está cerrado; si no, un borrador calculado en el momento.
rutasEventos.get(
  '/:id/informe.pdf',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    if (evento.estado === 'cerrado') {
      const { rows } = await query(
        `SELECT numero, snapshot, hash_sha256 FROM informes WHERE evento_id = $1 AND estado = 'vigente'`,
        [evento.id],
      );
      if (rows[0]) return enviarPdf(res, `informe-${rows[0].numero}.pdf`, rows[0].snapshot, rows[0].hash_sha256);
    }
    const snapshot = { numero: null, emitido_en: new Date().toISOString(), ...(await armarSnapshot(evento)) };
    enviarPdf(res, `borrador-${evento.slug}.pdf`, snapshot, null);
  }),
);

rutasEventos.get(
  '/:id/informes/:iid.pdf',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rows } = await query(
      'SELECT numero, snapshot, hash_sha256 FROM informes WHERE id = $1 AND evento_id = $2',
      [validarUuid(req.params.iid), evento.id],
    );
    if (!rows[0]) throw new ErrorHttp(404, 'Informe no encontrado.');
    enviarPdf(res, `informe-${rows[0].numero}.pdf`, rows[0].snapshot, rows[0].hash_sha256);
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
      `SELECT id, nombre, email, organizacion, perfil, origen, modo, modo_local, ocupantes, noches,
              acepta_comunicaciones, creado_en
       FROM asistentes WHERE evento_id = $1 ORDER BY creado_en DESC`,
      [evento.id],
    );
    res.json({ asistentes: rows.map((a) => ({ ...a, origen_nombre: nombreOrigen(a.origen) })) });
  }),
);

rutasEventos.get(
  '/:id/asistentes.csv',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rows } = await query(`SELECT * FROM asistentes WHERE evento_id = $1 ORDER BY creado_en`, [evento.id]);
    await auditar(req, 'asistentes.exportar', evento.id, { cantidad: rows.length });
    const csv = aCsv(
      [
        { titulo: 'Nombre', valor: (a) => a.nombre },
        { titulo: 'Correo', valor: (a) => a.email },
        { titulo: 'Organización', valor: (a) => a.organizacion },
        { titulo: 'Participa como', valor: (a) => a.perfil },
        { titulo: 'Origen', valor: (a) => nombreOrigen(a.origen) },
        { titulo: 'Traslado', valor: (a) => NOMBRE_MODO[a.modo] || a.modo },
        { titulo: 'Traslado desde el aeropuerto', valor: (a) => (a.modo_local ? NOMBRE_MODO_LOCAL[a.modo_local] : '') },
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

// Supresión de los datos de un asistente. Se permite aun con el evento cerrado:
// el informe emitido solo contiene cifras agregadas.
rutasEventos.delete(
  '/:id/asistentes/:aid',
  asincrono(async (req, res) => {
    const evento = await obtenerEvento(req.params.id);
    const { rowCount } = await query('DELETE FROM asistentes WHERE id = $1 AND evento_id = $2', [
      validarUuid(req.params.aid),
      evento.id,
    ]);
    if (!rowCount) throw new ErrorHttp(404, 'Asistente no encontrado.');
    await auditar(req, 'asistente.suprimir', evento.id, { asistente_id: req.params.aid });
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
    exigirAbierto(evento);
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
    exigirAbierto(evento);
    const { rowCount } = await query('DELETE FROM registros_operativos WHERE id = $1 AND evento_id = $2', [
      validarUuid(req.params.rid),
      evento.id,
    ]);
    if (!rowCount) throw new ErrorHttp(404, 'Registro no encontrado.');
    res.json({ ok: true });
  }),
);
