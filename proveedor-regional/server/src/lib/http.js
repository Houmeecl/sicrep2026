import { ZodError } from 'zod';

// Envuelve un handler async para que sus errores lleguen al manejador central.
export const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export function manejadorErrores(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const primero = err.issues[0];
    return res.status(400).json({
      error: primero?.message || 'Datos inválidos.',
      campo: primero?.path?.join('.'),
    });
  }
  if (err instanceof ErrorHttp) return res.status(err.status).json({ error: err.message });
  if (err?.code === '23505') return res.status(409).json({ error: 'El registro ya existe.' });
  console.error(err);
  res.status(500).json({ error: 'Error interno. Intenta nuevamente.' });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validarUuid(id) {
  if (!UUID.test(id)) throw new ErrorHttp(404, 'No encontrado.');
  return id;
}
