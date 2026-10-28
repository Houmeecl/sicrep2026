# Proveedor Regional

Sitio y plataforma de Proveedor Regional (Fundación Entretodos, Antofagasta).

- **Landing** pública con membresía, servicios, pasaporte, sello, territorio y preguntas frecuentes.
- **Login con roles**: Fundación (`admin`), Sostenibilidad (`sostenibilidad`) y Socio (`socio`).
- **Módulo de sostenibilidad de eventos** (metodología KONTAX Events, factores Chile 2026):
  - Registro de asistentes por QR desde el celular, con encuesta de traslado y consentimiento.
  - Captura de datos operativos: energía, residuos, catering, agua, infraestructura y otros.
  - Cálculo automático de huella (tCO₂e total, por asistente y por día) y criterios Evento Verde.
  - Exportación de asistentes en CSV e informe en PDF.

Stack: React 19 + Vite + Tailwind 4 · Node 22 + Express · PostgreSQL 16 · Docker + Caddy (HTTPS).

---

## Instalar en un VPS

Requisitos: un VPS con Ubuntu (2 GB de RAM es suficiente), Docker y un dominio apuntando a la IP del VPS (registro A).

```bash
# 1. Docker (si no está instalado)
curl -fsSL https://get.docker.com | sh

# 2. Sube este proyecto al VPS (git clone o scp) y entra a la carpeta
cd proveedor-regional

# 3. Configura las variables
cp .env.example .env
nano .env        # completa DOMINIO, DB_PASSWORD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
                 # JWT_SECRET: openssl rand -hex 32

# 4. Levanta todo
docker compose up -d --build

# 5. Revisa que esté funcionando
docker compose logs -f app
```

Caddy obtiene el certificado HTTPS automáticamente. Abre `https://TU-DOMINIO/ingresar` y entra con el
`ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. Cambia la contraseña desde **Mi cuenta** y luego puedes borrar
`ADMIN_PASSWORD` del `.env` (el administrador solo se crea si no existe ningún usuario).

Puertos que deben estar abiertos en el firewall: 80 y 443.

### Actualizar

```bash
git pull            # o vuelve a subir los archivos
docker compose up -d --build
```

Las migraciones de base de datos se aplican solas al iniciar.

### Respaldos

```bash
# Respaldo manual
docker compose exec db pg_dump -U proveedor proveedor_regional | gzip > respaldo-$(date +%F).sql.gz

# Restaurar
gunzip -c respaldo-AAAA-MM-DD.sql.gz | docker compose exec -T db psql -U proveedor proveedor_regional
```

Recomendado: un cron diario con el comando de respaldo y copia fuera del VPS.

---

## Desarrollo local

Requisitos: Node 22 y PostgreSQL.

```bash
createdb proveedor_regional

# API (puerto 3000)
cd server
npm install
ADMIN_EMAIL=admin@local.cl ADMIN_PASSWORD=clave-local-123 npm run dev

# Frontend (puerto 5173, con proxy a la API)
cd web
npm install
npm run dev
```

Por defecto la API usa `postgres://postgres:postgres@localhost:5432/proveedor_regional`; cámbialo con
`DATABASE_URL`. Pruebas del cálculo: `cd server && npm test`.

---

## Cómo se calcula la huella

Archivo: `server/src/lib/calculadora.js` (factores en `server/src/lib/factores.js`).

| Categoría | Dato | Cálculo |
|---|---|---|
| Transporte | Registro QR: origen, medio, ocupantes | Distancia aproximada × 2 (ida y vuelta) × factor del medio. Auto: 0,48 kgCO₂e/km por vehículo ÷ ocupantes. El promedio de los registrados se extiende al total de asistentes. |
| Energía | kWh, litros, m³, kg | Cantidad × factor (red 0,40 kgCO₂e/kWh; renovable 0,05; diésel 2,68/L…) |
| Residuos | kg por destino y material | Vertedero 0,517 · incineración 0,21 · compostaje 0,05 · reciclaje 0,02 kgCO₂e/kg. Emisiones evitadas por reciclaje se informan aparte y no se descuentan. |
| Catering | kg por tipo de alimento, envases | Cantidad × factor por alimento |
| Agua | m³ o litros | Red 0,344 kgCO₂e/m³; embotellada 0,244 kgCO₂e/L |
| Infraestructura y otros | Medición en kgCO₂e | Si no hay medición: 0,75 y 0,2 tCO₂e por cada 1.000 asistentes (marcado "estimado") |

**Asistentes considerados**: los reales (si se cargan en Configuración); si no, el mayor entre registrados y esperados.

**Evento Verde**: máx. 15 kgCO₂e por asistente, mín. 60 % reciclaje/compostaje y mín. 30 % electricidad renovable.

**Alojamiento**: las noches se registran pero no se suman mientras `alojamiento_noche` sea `null` en
`factores.js` (no hay factor validado en la metodología).

Las distancias por ciudad de origen son aproximadas y suponen un evento en Antofagasta: ajústalas en
`ORIGENES` si el evento es en otra ciudad. Valida los factores antes de emitir informes oficiales.

---

## Datos personales

- El registro exige consentimiento explícito y guarda la versión del texto y la fecha (`CONSENTIMIENTO_VERSION`).
- El consentimiento para comunicaciones es separado y opcional.
- Desde la pestaña **Asistentes** se pueden eliminar los datos de una persona (derecho de supresión).
- Los informes y el panel solo muestran cifras agregadas.
- Completa los textos entre corchetes de `/privacidad` y haz revisar la política por un abogado antes de publicar.

## Seguridad

- Contraseñas con bcrypt; sesión en cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción (8 horas).
- Límite de intentos en el login y en el registro público.
- Las peticiones que modifican datos deben ser JSON; cabeceras de seguridad con Helmet y CSP.
- La exportación CSV neutraliza fórmulas para evitar inyección en Excel.

## Pendientes conocidos

- Textos entre corchetes en la landing (IVA, política de preinscripción, plazo, pymes por comuna, contacto).
- Preinscripción con pago Flow y KYC, pasaporte de socios y verificador de sello: aún no implementados
  (el botón de verificación está deshabilitado).
- Recuperación de contraseña por correo: hoy la restablece un administrador desde **Usuarios**.
