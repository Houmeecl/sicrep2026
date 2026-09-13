# SICREP — Programa Proveedor Regional

Centro de desarrollo de proveedores regionales: tarjeta de débito (integración
futura con Pomelo), protección paramétrica, capacitación (Academia Proveedor
Regional) y microfinanzas, para pymes que abastecen a grandes empresas/mineras.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (estilo), wouter (routing), TanStack Query.
- **Backend:** Express + TypeScript, sesión con `express-session` + `connect-pg-simple`.
- **Base de datos:** PostgreSQL + Drizzle ORM.

## Estructura

```
client/    Frontend (Vite root)
server/    API Express + servicios simulados (Pomelo, protección paramétrica)
shared/    Esquema de base de datos (Drizzle) compartido por cliente y servidor
```

## Desarrollo local

1. Copia `.env` (ya incluido para desarrollo local) y ajusta `DATABASE_URL` si es necesario.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Crea las tablas en Postgres:
   ```bash
   npm run db:push
   ```
4. Siembra datos de ejemplo (crea un proveedor y una empresa demo):
   ```bash
   npm run db:seed
   ```
5. Levanta el servidor de desarrollo (sirve API + cliente con Vite):
   ```bash
   npm run dev
   ```
   Abre http://localhost:5000

### Credenciales de prueba (tras `npm run db:seed`)

- Proveedor: `proveedor@demo.sicrep.cl` / `proveedor123`
- Empresa: `empresa@demo.sicrep.cl` / `empresa123`

## Build de producción

```bash
npm run build
npm start
```

## Notas de integración

- **Tarjeta Pomelo:** `server/services/pomelo.ts` simula la emisión y el saldo
  de la Tarjeta Proveedor Regional. Cuando exista convenio y credenciales con
  Pomelo, solo esta capa cambia de implementación (no las rutas ni la UI).
- **Protección paramétrica:** `server/services/parametric.ts` define coberturas
  de ejemplo; en producción se conectaría a un proveedor de datos (clima,
  continuidad operacional) que dispare pagos automáticos.
- **Módulo de tarjetas externo ("Cursor"):** `server/services/cursor-integration.ts`
  solo documenta la interfaz esperada — no está identificado ni implementado.
  La emisión de tarjetas sigue usando la simulación de `pomelo.ts`.

## Convocatoria regional (`/convocatoria`)

Landing de inscripción con cupos por comuna (Antofagasta, Mejillones, Taltal, San Pedro
de Atacama, María Elena) y pago real vía **Flow** (`server/services/flow.ts`).

- Cupos: `server/services/cupos.ts` calcula 200 cupos totales con un mínimo de 20 por
  comuna y el resto proporcional a la población de cada una (algoritmo, no valores fijos).
- Pago: configura `FLOW_API_KEY`, `FLOW_SECRET_KEY` y `APP_BASE_URL` en `.env` para
  habilitar el cobro real (ver plantilla en `.env`). **Sin esas variables, el sistema
  nunca simula un pago exitoso** — la inscripción queda como "pago pendiente de
  habilitar" y no se cobra nada.
- El monto de inscripción (`INSCRIPTION_FEE_CLP` en `server/services/cupos.ts`) es un
  valor provisional para poder probar el flujo — confirmar el monto real del negocio
  antes de operar en producción.

## Publicar en GitHub

Este proyecto se generó como repositorio git local. Para subirlo:

```bash
git remote add origin <URL_DEL_REPO>
git push -u origin main
```

## Despliegue en producción (VPS vía GitHub Actions)

El workflow `.github/workflows/deploy.yml` se conecta por SSH al VPS de producción en
cada push a `main` (o manualmente desde la pestaña Actions → "Desplegar SICREP en VPS" →
"Run workflow"). Provisiona Node.js/PostgreSQL/pm2 si faltan, actualiza el código,
construye la app y la deja corriendo con `pm2`.

Requiere estos **GitHub Actions Secrets** (Settings → Secrets and variables → Actions),
nunca en el código: `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PASSWORD`, `DATABASE_URL`,
`SESSION_SECRET`, `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_ENV`, `APP_BASE_URL`.

**Pendiente:** `APP_BASE_URL` apunta hoy a la IP directa por HTTP; Flow.cl normalmente
exige URLs de retorno/confirmación por HTTPS, así que para cobrar en serio hace falta un
dominio apuntando al VPS + Nginx + certificado TLS (Let's Encrypt).
