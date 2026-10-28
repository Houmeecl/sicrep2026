import { query } from '../db/pool.js';

// Registra una acción sensible: exportar datos personales, eliminar, cerrar informes, cambiar usuarios.
// Nunca guarda contraseñas ni datos personales de asistentes en el detalle.
export async function auditar(req, accion, objeto = null, detalle = {}, cliente = { query }) {
  await cliente.query(
    'INSERT INTO auditoria (usuario_id, accion, objeto, detalle, ip) VALUES ($1, $2, $3, $4, $5)',
    [req.usuario?.id ?? null, accion, objeto, detalle, req.ip ?? null],
  );
}
