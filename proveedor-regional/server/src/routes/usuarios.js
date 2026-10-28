import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asincrono, ErrorHttp, validarUuid } from '../lib/http.js';
import { hashClave, requiereRol } from '../lib/auth.js';

export const rutasUsuarios = Router();
rutasUsuarios.use(requiereRol('admin'));

const ROLES = ['admin', 'sostenibilidad', 'socio'];

rutasUsuarios.get(
  '/',
  asincrono(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, email, nombre, rol, activo, creado_en, ultimo_ingreso
       FROM usuarios ORDER BY creado_en`,
    );
    res.json({ usuarios: rows });
  }),
);

const esquemaNuevo = z.object({
  email: z.string().trim().email('Correo inválido.').max(200),
  nombre: z.string().trim().min(2, 'Ingresa el nombre.').max(120),
  rol: z.enum(ROLES),
  clave: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200),
});

rutasUsuarios.post(
  '/',
  asincrono(async (req, res) => {
    const d = esquemaNuevo.parse(req.body);
    const { rows } = await query(
      `INSERT INTO usuarios (email, nombre, rol, password_hash)
       VALUES (lower($1), $2, $3, $4)
       RETURNING id, email, nombre, rol, activo, creado_en`,
      [d.email, d.nombre, d.rol, await hashClave(d.clave)],
    );
    res.status(201).json({ usuario: rows[0] });
  }),
);

const esquemaCambio = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
  clave: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').max(200).optional(),
});

rutasUsuarios.patch(
  '/:id',
  asincrono(async (req, res) => {
    const id = validarUuid(req.params.id);
    const d = esquemaCambio.parse(req.body);
    if (id === req.usuario.id && (d.activo === false || (d.rol && d.rol !== 'admin'))) {
      throw new ErrorHttp(400, 'No puedes desactivarte ni quitarte el rol de administrador.');
    }
    const { rows } = await query(
      `UPDATE usuarios SET
         nombre = COALESCE($2, nombre),
         rol = COALESCE($3, rol),
         activo = COALESCE($4, activo),
         password_hash = COALESCE($5, password_hash)
       WHERE id = $1
       RETURNING id, email, nombre, rol, activo, creado_en, ultimo_ingreso`,
      [id, d.nombre ?? null, d.rol ?? null, d.activo ?? null, d.clave ? await hashClave(d.clave) : null],
    );
    if (!rows[0]) throw new ErrorHttp(404, 'Usuario no encontrado.');
    res.json({ usuario: rows[0] });
  }),
);
