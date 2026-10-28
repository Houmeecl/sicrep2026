import { config, problemasDeConfiguracion } from './config.js';
import { pool } from './db/pool.js';
import { migrar } from './db/migrate.js';
import { asegurarAdmin } from './lib/auth.js';
import { crearApp } from './app.js';

async function iniciar() {
  const problemas = problemasDeConfiguracion();
  if (problemas.length) {
    throw new Error(`Configuración insegura o inválida:\n- ${problemas.join('\n- ')}`);
  }
  await migrar();
  await asegurarAdmin();

  const servidor = crearApp().listen(config.port, () => {
    console.log(`Proveedor Regional escuchando en el puerto ${config.port}`);
  });

  // Apagado ordenado: deja de aceptar conexiones, termina las peticiones en curso y cierra la base de datos.
  let cerrando = false;
  const apagar = (senal) => {
    if (cerrando) return;
    cerrando = true;
    console.log(`Recibida ${senal}: cerrando el servidor…`);
    const forzar = setTimeout(() => {
      console.error('El cierre tardó demasiado; se fuerza la salida.');
      process.exit(1);
    }, 15000);
    forzar.unref();
    servidor.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    servidor.closeIdleConnections?.();
  };
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));
}

iniciar().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err.message || err);
  process.exit(1);
});
