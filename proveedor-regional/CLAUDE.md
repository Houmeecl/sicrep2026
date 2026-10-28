# Proveedor Regional — contexto para Claude Code

Plataforma de Proveedor Regional, institución de desarrollo de proveedores de la Región de Antofagasta,
operada por Fundación Entretodos (sin fines de lucro). Idioma de la interfaz, el código y los mensajes: español de Chile.

## Estructura

- `server/` — API Node 22 + Express (ESM, JavaScript), PostgreSQL con `pg`, validación con `zod`.
  - `src/db/migrate.js`: migraciones en orden; se aplican solas al iniciar. Agregar nuevas al final de `MIGRACIONES`.
  - `src/lib/factores.js`: factores de emisión KONTAX Events (Chile 2026), orígenes con distancias, subtipos de captura.
  - `src/lib/calculadora.js`: cálculo puro de huella (sin BD). Tiene pruebas en `test/`.
  - `src/routes/`: `auth`, `usuarios` (solo admin), `publico` (registro QR sin login), `eventos` (admin y sostenibilidad).
- `web/` — React 19 + Vite + Tailwind 4 (tokens de marca en `src/styles.css` con `@theme` y `@utility`).
- `Dockerfile`, `docker-compose.yml`, `Caddyfile` — despliegue en VPS con HTTPS automático.

## Comandos

```bash
cd server && npm install && npm test          # pruebas del cálculo
cd server && ADMIN_EMAIL=a@b.cl ADMIN_PASSWORD=clave-local-123 npm run dev   # API :3000
cd web && npm install && npm run dev          # frontend :5173 (proxy a /api)
cd web && npm run build                       # verificar que compila
```

## Roles

`admin` (Fundación), `sostenibilidad`, `socio`. Sesión en cookie httpOnly con JWT (8 h).

## Decisiones tomadas

- El sello y el pasaporte son de la **empresa**, no de trabajadores: no compiten con las acreditadoras de faena ni con SICEP.
- Transporte: ida y vuelta desde la ciudad de origen declarada; el promedio de los registrados se extiende al total
  de asistentes (reales si existen; si no, el mayor entre registrados y esperados).
- Emisiones evitadas por reciclaje se informan aparte, no se descuentan.
- Alojamiento se registra pero no se suma (`alojamiento_noche: null`) hasta tener un factor validado.
- Evento Verde: máx. 15 kgCO₂e/asistente, mín. 60 % reciclaje+compostaje, mín. 30 % electricidad renovable.
- Membresía única: $120.000/mes por empresa. Preinscripción: pago único $20.000 vía Flow.
- Paleta: azul petróleo (estructura), cobre (sello e identidad), naranjo solo para acciones.

## Pendientes (en orden sugerido)

1. Desplegar en el VPS y probar el QR del evento OCDE con celulares reales.
2. Preinscripción con pago Flow (API de pagos, webhook idempotente, firma HMAC) y KYC con revisión manual.
3. Pasaporte documental de socios: bóveda cifrada, revisión por la fundación, alertas de vencimiento.
4. Verificador público del sello (`/verificar/:token`, token firmado, nunca el RUT).
5. Recuperación de contraseña por correo (Resend).
6. Completar textos entre corchetes de la landing y de `/privacidad` (revisión legal: Ley 21.719 y Ley 20.416).

## Cuidados

- Datos personales: el registro exige consentimiento explícito y guarda su versión. Nunca exponer datos de
  asistentes o trabajadores en vistas públicas; los informes son agregados.
- No usar logos de SICEP, mineras ni ISO sin autorización. No decir "certificado ISO 25500".
- Validar factores de emisión antes de emitir informes oficiales.
