// Configuración leída desde variables de entorno.
const env = process.env;
const produccion = env.NODE_ENV === 'production';

function requerida(nombre, porDefectoDev) {
  const valor = env[nombre];
  if (valor) return valor;
  if (produccion) throw new Error(`Falta la variable de entorno ${nombre}.`);
  return porDefectoDev;
}

export const config = {
  env: env.NODE_ENV || 'development',
  produccion,
  port: Number(env.PORT || 3000),
  databaseUrl: requerida('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/proveedor_regional'),
  jwtSecret: requerida('JWT_SECRET', 'dev-secret-cambiar-solo-para-desarrollo-local'),
  // URL pública del sitio, usada para los QR de registro (sin barra final).
  publicUrl: (env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Administrador inicial: se crea solo si no existe ningún usuario.
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || '',
  adminNombre: env.ADMIN_NOMBRE || 'Administrador',
  // Versión del texto de consentimiento mostrado en el registro.
  consentimientoVersion: env.CONSENTIMIENTO_VERSION || '2026-10',
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : produccion,
  // Registros públicos por minuto desde una misma IP (el WiFi de un recinto comparte IP).
  limiteRegistrosPorIp: Number(env.LIMITE_REGISTROS_POR_IP || 600),
};

// Revisa que la configuración de producción sea segura. Devuelve la lista de problemas.
export function problemasDeConfiguracion(c = config) {
  const problemas = [];
  if (c.produccion) {
    if (c.jwtSecret.length < 32) problemas.push('JWT_SECRET debe tener al menos 32 caracteres (usa: openssl rand -hex 32).');
    if (!c.publicUrl.startsWith('https://')) problemas.push('PUBLIC_URL debe comenzar con https:// en producción.');
    if (c.adminPassword && c.adminPassword.length < 12) problemas.push('ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }
  if (!Number.isFinite(c.limiteRegistrosPorIp) || c.limiteRegistrosPorIp < 1) {
    problemas.push('LIMITE_REGISTROS_POR_IP debe ser un número mayor que 0.');
  }
  return problemas;
}
