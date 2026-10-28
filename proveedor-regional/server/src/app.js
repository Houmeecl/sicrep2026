import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cargarUsuario } from './lib/auth.js';
import { manejadorErrores } from './lib/http.js';
import { query } from './db/pool.js';
import { rutasAuth } from './routes/auth.js';
import { rutasUsuarios } from './routes/usuarios.js';
import { rutasPublico } from './routes/publico.js';
import { rutasEventos } from './routes/eventos.js';

const dirActual = path.dirname(fileURLToPath(import.meta.url));

export function crearApp({ dirWeb = path.resolve(dirActual, '../../web/dist'), logs = true } = {}) {
  const app = express();
  app.set('trust proxy', 1); // detrás de Caddy/Nginx
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  if (logs) app.use(morgan('tiny'));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Las peticiones que cambian datos deben ser JSON (protege contra formularios de otros sitios).
  app.use('/api', (req, res, next) => {
    const conCuerpo = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding'];
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && conCuerpo && !req.is('application/json')) {
      return res.status(415).json({ error: 'Se esperaba JSON.' });
    }
    next();
  });
  app.use('/api', cargarUsuario);

  app.get('/api/salud', async (_req, res) => {
    await query('SELECT 1');
    res.json({ ok: true });
  });
  app.use('/api/auth', rutasAuth);
  app.use('/api/usuarios', rutasUsuarios);
  app.use('/api/publico', rutasPublico);
  app.use('/api/eventos', rutasEventos);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

  // Frontend compilado (SPA).
  if (fs.existsSync(dirWeb)) {
    app.use(express.static(dirWeb, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dirWeb, 'index.html')));
  }

  app.use(manejadorErrores);
  return app;
}
