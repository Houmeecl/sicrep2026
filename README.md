# Proveedor Regional

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

- Proveedor: `proveedor@demo.proveedorregional.com` / `proveedor123`
- Empresa: `empresa@demo.proveedorregional.com` / `empresa123`

## Build de producción

```bash
npm run build
npm start
```

## Notas de integración

- **Tarjeta Pomelo:** `server/services/pomelo.ts` simula la emisión y el saldo
  de la Tarjeta Proveedor Regional. Cuando exista convenio y credenciales con
  Pomelo, solo esta capa cambia de implementación (no las rutas ni la UI).
- **Protección / seguros (Nico Seguros):** `server/services/nicoSeguros.ts` integra la
  API real de Nico Seguros (login, emisión y consulta de pólizas). Preparada pero **no
  conectada** — faltan credenciales (`NICO_SEGUROS_EMAIL`, `NICO_SEGUROS_PASSWORD`, y para
  emitir pólizas también `NICO_SEGUROS_DEFAULT_CATEGORY_ID` / `NICO_SEGUROS_DEFAULT_COMPANY_ID`).
  Mientras no estén configuradas (o si la llamada real falla), el sistema usa el fallback
  simulado de `server/services/parametric.ts`, y cada póliza queda marcada en la base de
  datos (`insurance_policies.source`) como `"simulado"` o `"nico_seguros"` según corresponda
  — nunca se presenta una cobertura simulada como real.
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

## Preinscripción con KYC, pago de $20.000 y tarjeta en wallet (`/preinscripcion`)

Flujo del postulante: **datos y declaraciones → código por correo → documentos → pago Flow $20.000 →
revisión KYC → tarjeta de membresía en Apple Wallet / Google Wallet**. Se puede retomar en cualquier
momento con el enlace personal que llega por correo (`/preinscripcion/estado?id=…&t=…`).

| Ruta | Para quién |
|---|---|
| `/preinscripcion` | Formulario: contribuyente, representante, PEP, beneficiarios finales, consentimientos |
| `/preinscripcion/estado` | Avance, código de correo, carga de documentos, pago, tarjeta y botones wallet |
| `/verificar/:codigo?s=…` | Página pública que abre el QR de la tarjeta: vigente / vencida / revocada / no auténtica |
| `/admin/preinscripciones` | Revisión KYC (rol `admin`): documentos, PEP, beneficiarios, bitácora, aprobar/observar/rechazar, revocar |

Qué se verifica (código en `server/services/preinscripcion.ts`):

- **Automático:** dígito verificador de todos los RUT; coherencia persona jurídica/natural; correo por código
  (HMAC, 10 min, 5 intentos); tipo real de cada archivo (PDF/JPG/PNG por firma binaria) y SHA-256; un solo
  registro activo por RUT (índice único parcial); pago consultado a Flow con la API firmada, validando orden y
  monto exacto; límites por IP en creación y códigos.
- **Manual (admin):** cédula vigente y del representante, inicio de actividades ante el SII, poderes,
  declaración PEP y beneficiarios finales (≥10%). La existencia de la empresa en el SII **no** se consulta
  automáticamente: el SII no ofrece una API pública para eso; se acredita con el documento adjunto.
- **Emisión:** la tarjeta solo se emite con **pago confirmado + KYC aprobado**. El QR lleva una firma HMAC
  (`CARD_SIGNING_SECRET`) y la verificación lee el estado vivo en la base: una tarjeta revocada o vencida
  deja de validar de inmediato, aunque el pase siga guardado en el teléfono.
- **Auditoría:** toda acción queda en `preinscripcion_eventos` (append-only) con IP; los documentos se guardan
  fuera de la carpeta pública (`UPLOAD_DIR`) con permisos 600.

Puesta en marcha:

1. Variables: ver `.env.example` (Flow, SMTP, `CARD_SIGNING_SECRET`, Apple y Google Wallet).
   Sin Apple/Google configurados, la tarjeta funciona con su QR y los botones wallet no se muestran.
   Sin SMTP en producción no se pueden enviar códigos (no se omite la verificación de correo).
2. `npm run db:push` para crear las tablas nuevas.
3. Crear un revisor: `ADMIN_PASSWORD="…" npm run admin:create -- revisor@sicr3p.cl "Nombre Apellido"`.
4. **Apple Wallet:** en developer.apple.com crear un *Pass Type ID*, generar su certificado, exportar
   certificado y clave a PEM y descargar el intermedio *Apple WWDR G4*. **Google Wallet:** en
   pay.google.com/business/console activar Google Wallet API, crear una cuenta de servicio con acceso al emisor
   y guardar su clave privada en PEM.

Términos y condiciones: `shared/terminos.ts`, publicados en `/preinscripcion/terminos/2026-10` y enlazados desde el
formulario; cada consentimiento guarda la versión aceptada. **Revisión legal antes de operar.** Una versión publicada
no se edita: los cambios van en una versión nueva.

Pendiente de confirmar por negocio: vigencia de la tarjeta (`PREINSCRIPCION_VIGENCIA_MESES`, por defecto 12) y plazo
de devolución si un KYC se rechaza después del pago (los segundos cobros quedan marcados `pago_duplicado`).

## Servidor de correo (soporte@sicr3p.cl)

El dominio `sicr3p.cl` usa los DNS de DonWeb y su correo está en `mail.sicr3p.cl`. El sistema envía por SMTP
con la cuenta `soporte@sicr3p.cl`:

1. En el panel de DonWeb crear la casilla `soporte@sicr3p.cl` (si no existe) y anotar su contraseña.
2. En GitHub → Settings → Secrets → Actions:
   `SMTP_HOST=mail.sicr3p.cl`, `SMTP_PORT=465`, `SMTP_USER=soporte@sicr3p.cl`, `SMTP_PASS=…`,
   `MAIL_FROM=Proveedor Regional <soporte@sicr3p.cl>` (si 465 no conecta, probar `SMTP_PORT=587`).
3. En la zona DNS de DonWeb, para que los correos no caigan en spam:
   - **SPF** (TXT en `sicr3p.cl`): `v=spf1 mx a ~all` (agregar `include:` del proveedor si se envía desde otro servicio).
   - **DKIM**: activarlo en el panel de correo de DonWeb y publicar el registro TXT que entrega.
   - **DMARC** (TXT en `_dmarc.sicr3p.cl`): `v=DMARC1; p=none; rua=mailto:soporte@sicr3p.cl` para empezar a monitorear.
4. Probar desde el servidor: `npm run mail:test -- tu-correo@dominio.cl`. Verifica conexión y credenciales y envía un
   correo de prueba; revisar que llegue a la bandeja de entrada y no a spam.

## Publicar en GitHub

Este proyecto se generó como repositorio git local. Para subirlo:

```bash
git remote add origin <URL_DEL_REPO>
git push -u origin main
```
