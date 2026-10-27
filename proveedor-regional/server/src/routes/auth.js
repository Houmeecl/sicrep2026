import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asincrono, ErrorHttp } from '../lib/http.js';
import {
  emitirSesion,
  cerrarSesion,
  verificarClave,
  hashClave,
  requiereRol,
} from '../lib/auth.js';

export const rutasAuth = Router();

const limiteIngreso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' },
});

const esquemaIngreso = z.object({
  email: z.string().trim().email('Correo inválido.').max(200),
  clave: z.string().min(1, 'Ingresa tu contraseña.').max(200),
});

rutasAuth.post(
  '/login',
  limiteIngreso,
  asincrono(async (req, res) => {
    const { email, clave } = esquemaIngreso.parse(req.body);
    const { rows } = await query(
      'SELECT id, email, nombre, rol, activo, password_hash FROM usuarios WHERE lower(email) = lower($1)',
      [email],
    );
    const usuario = rows[0];
    const ok = usuario && usuario.activo && (await verificarClave(clave, usuario.password_hash));
    if (!ok) throw new ErrorHttp(401, 'Correo o contraseña incorrectos.');
    await query('UPDATE usuarios SET ultimo_ingreso = now() WHERE id = $1', [usuario.id]);
    emitirSesion(res, usuario);
    res.json({ usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol } });
  }),
);

rutasAuth.post('/logout', (_req, res) => {
  cerrarSesion(res);
  res.json({ ok: true });
});

rutasAuth.get('/me', (req, res) => {
  if (!req.usuario) return res.json({ usuario: null });
  const { id, email, nombre, rol } = req.usuario;
  res.json({ usuario: { id, email, nombre, rol } });
});

const esquemaCambioClave = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(10, 'La nueva contraseña debe tener al menos 10 caracteres.').max(200),
});

rutasAuth.post(
  '/cambiar-clave',
  requiereRol(),
  asincrono(async (req, res) => {
    const { actual, nueva } = esquemaCambioClave.parse(req.body);
    const { rows } = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
    if (!(await verificarClave(actual, rows[0].password_hash))) {
      throw new ErrorHttp(400, 'La contraseña actual no es correcta.');
    }
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [await hashClave(nueva), req.usuario.id]);
    res.json({ ok: true });
  }),
);
