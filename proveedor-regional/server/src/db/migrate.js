import { pool } from './pool.js';

// Migraciones en orden. Cada una se aplica una sola vez y queda registrada.
const MIGRACIONES = [
  {
    id: '001_esquema_inicial',
    sql: `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        nombre TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL CHECK (rol IN ('admin', 'sostenibilidad', 'socio')),
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        ultimo_ingreso TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX usuarios_email_unico ON usuarios (lower(email));

      CREATE TABLE eventos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'conferencia',
        ciudad TEXT NOT NULL DEFAULT 'Antofagasta',
        recinto TEXT,
        fecha_inicio DATE,
        fecha_fin DATE,
        dias INTEGER NOT NULL DEFAULT 1 CHECK (dias > 0),
        asistentes_estimados INTEGER CHECK (asistentes_estimados >= 0),
        asistentes_reales INTEGER CHECK (asistentes_reales >= 0),
        estado TEXT NOT NULL DEFAULT 'planificacion'
          CHECK (estado IN ('planificacion', 'en_curso', 'finalizado')),
        registro_abierto BOOLEAN NOT NULL DEFAULT TRUE,
        creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE asistentes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL,
        organizacion TEXT,
        perfil TEXT NOT NULL,
        origen TEXT NOT NULL,
        modo TEXT NOT NULL,
        ocupantes INTEGER NOT NULL DEFAULT 1 CHECK (ocupantes BETWEEN 1 AND 8),
        noches INTEGER NOT NULL DEFAULT 0 CHECK (noches BETWEEN 0 AND 30),
        consentimiento_version TEXT NOT NULL,
        consentimiento_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        acepta_comunicaciones BOOLEAN NOT NULL DEFAULT FALSE,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX asistentes_email_por_evento ON asistentes (evento_id, lower(email));

      CREATE TABLE registros_operativos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        categoria TEXT NOT NULL
          CHECK (categoria IN ('energia', 'residuos', 'catering', 'agua', 'infraestructura', 'otros')),
        subtipo TEXT NOT NULL,
        cantidad NUMERIC(14, 3) NOT NULL CHECK (cantidad >= 0),
        detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
        nota TEXT,
        creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX registros_por_evento ON registros_operativos (evento_id, categoria);
    `,
  },
  {
    id: '002_cierre_y_trazabilidad',
    sql: `
      ALTER TABLE eventos
        ADD COLUMN ciudad_base TEXT NOT NULL DEFAULT 'antofagasta',
        ADD COLUMN km_aeropuerto NUMERIC(6, 1) NOT NULL DEFAULT 25 CHECK (km_aeropuerto BETWEEN 0 AND 300),
        ADD COLUMN factor_alojamiento_kg_noche NUMERIC(8, 3) CHECK (factor_alojamiento_kg_noche >= 0),
        ADD COLUMN fuente_factor_alojamiento TEXT;
      ALTER TABLE eventos DROP CONSTRAINT eventos_estado_check;
      ALTER TABLE eventos ADD CONSTRAINT eventos_estado_check
        CHECK (estado IN ('planificacion', 'en_curso', 'finalizado', 'cerrado'));

      ALTER TABLE asistentes ADD COLUMN modo_local TEXT;

      CREATE SEQUENCE informes_numero_seq;
      CREATE TABLE informes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        numero TEXT NOT NULL UNIQUE,
        estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'reemplazado')),
        metodologia_version TEXT NOT NULL,
        snapshot JSONB NOT NULL,
        hash_sha256 TEXT NOT NULL,
        emitido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        emitido_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX informes_por_evento ON informes (evento_id, emitido_en DESC);
      CREATE UNIQUE INDEX informe_vigente_por_evento ON informes (evento_id) WHERE estado = 'vigente';

      CREATE TABLE auditoria (
        id BIGSERIAL PRIMARY KEY,
        usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        accion TEXT NOT NULL,
        objeto TEXT,
        detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
        ip TEXT,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX auditoria_por_fecha ON auditoria (creado_en DESC);
    `,
  },
];

export async function migrar() {
  const cliente = await pool.connect();
  try {
    await cliente.query(`CREATE TABLE IF NOT EXISTS migraciones (
      id TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now())`);
    // Evita que dos instancias migren a la vez.
    await cliente.query('SELECT pg_advisory_lock(727001)');
    const { rows } = await cliente.query('SELECT id FROM migraciones');
    const aplicadas = new Set(rows.map((r) => r.id));
    for (const m of MIGRACIONES) {
      if (aplicadas.has(m.id)) continue;
      await cliente.query('BEGIN');
      try {
        await cliente.query(m.sql);
        await cliente.query('INSERT INTO migraciones (id) VALUES ($1)', [m.id]);
        await cliente.query('COMMIT');
        console.log(`Migración aplicada: ${m.id}`);
      } catch (err) {
        await cliente.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    await cliente.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    cliente.release();
  }
}

// Permite ejecutar `node src/db/migrate.js` directamente.
if (import.meta.url === `file://${process.argv[1]}`) {
  migrar()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
