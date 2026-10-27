import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { query } from '../db/pool.js';

export const COOKIE = 'pr_sesion';
const DURACION_SEG = 60 * 60 * 8; // 8 horas

export function hashClave(clave) {
  return bcrypt.hash(clave, 12);
}

export function verificarClave(clave, hash) {
  return bcrypt.compare(clave, hash);
}

export function emitirSesion(res, usuario) {
  const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, {
    expiresIn: DURACION_SEG,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: DURACION_SEG * 1000,
    path: '/',
  });
}

export function cerrarSesion(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

// Carga el usuario de la sesión (si existe) y lo deja en req.usuario.
export async function cargarUsuario(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const datos = jwt.verify(token, config.jwtSecret);
    const { rows } = await query(
      'SELECT id, email, nombre, rol, activo FROM usuarios WHERE id = $1',
      [datos.sub],
    );
    if (rows[0]?.activo) req.usuario = rows[0];
  } catch {
    // Token inválido o vencido: se trata como no autenticado.
  }
  next();
}

export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    if (roles.length && !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    }
    next();
  };
}

// Crea el administrador inicial si la tabla de usuarios está vacía.
export async function asegurarAdmin() {
  const { rows } = await query('SELECT count(*)::int AS n FROM usuarios');
  if (rows[0].n > 0) return;
  if (!config.adminEmail || !config.adminPassword) {
    console.warn('No hay usuarios. Define ADMIN_EMAIL y ADMIN_PASSWORD para crear el administrador inicial.');
    return;
  }
  await query(
    `INSERT INTO usuarios (email, nombre, password_hash, rol) VALUES ($1, $2, $3, 'admin')`,
    [config.adminEmail.toLowerCase(), config.adminNombre, await hashClave(config.adminPassword)],
  );
  console.log(`Administrador inicial creado: ${config.adminEmail}`);
}
