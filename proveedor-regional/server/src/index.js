import { config } from './config.js';
import { migrar } from './db/migrate.js';
import { asegurarAdmin } from './lib/auth.js';
import { crearApp } from './app.js';

async function iniciar() {
  await migrar();
  await asegurarAdmin();
  crearApp().listen(config.port, () => {
    console.log(`Proveedor Regional escuchando en el puerto ${config.port}`);
  });
}

iniciar().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
});
