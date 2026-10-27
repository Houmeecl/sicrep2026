import pg from 'pg';
import { config } from '../config.js';

// Los NUMERIC de Postgres llegan como texto; los convertimos a número.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// Los DATE se mantienen como texto 'AAAA-MM-DD' para evitar corrimientos de zona horaria.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export function query(text, params) {
  return pool.query(text, params);
}
