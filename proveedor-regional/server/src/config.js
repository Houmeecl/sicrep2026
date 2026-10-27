// Configuración leída desde variables de entorno.
const env = process.env;

function requerida(nombre, porDefectoDev) {
  const valor = env[nombre];
  if (valor) return valor;
  if (env.NODE_ENV === 'production') {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return porDefectoDev;
}

export const config = {
  env: env.NODE_ENV || 'development',
  port: Number(env.PORT || 3000),
  databaseUrl: requerida('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/proveedor_regional'),
  jwtSecret: requerida('JWT_SECRET', 'dev-secret-cambiar'),
  // URL pública del sitio, usada para los QR de registro (sin barra final).
  publicUrl: (env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Administrador inicial: se crea solo si no existe ningún usuario.
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  adminNombre: env.ADMIN_NOMBRE || 'Administrador',
  // Versión del texto de consentimiento mostrado en el registro.
  consentimientoVersion: env.CONSENTIMIENTO_VERSION || '2026-10',
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production',
};
