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
`DATABASE_URL`.

Pruebas: `cd server && npm test` ejecuta las del cálculo. Para incluir las de la API, crea una base cuyo nombre
contenga "test" (se borra en cada ejecución) y ejecuta:

```bash
createdb pr_test
TEST_DATABASE_URL=postgres://postgres@localhost/pr_test npm test
```

GitHub Actions (`.github/workflows/proveedor-regional-ci.yml`) corre las pruebas, compila el frontend, construye la
imagen Docker y verifica que arranque en cada cambio dentro de `proveedor-regional/`.

---

## Cómo se calcula la huella

Archivos: `server/src/lib/calculadora.js` (cálculo) y `server/src/lib/factores.js` (factores con unidad y fuente).
Versión de la metodología: `METODOLOGIA.version`; súbela si cambias un factor.

| Categoría | Dato | Cálculo |
|---|---|---|
| Transporte | Registro QR: ciudad de origen, medio, ocupantes, traslado desde el aeropuerto | Ida y vuelta. Distancia en línea recta entre coordenadas de la ciudad de origen y la sede, × 1,3 por carretera o × 1,08 por ruta aérea. Avión: banda doméstica, regional o internacional según distancia, más el traslado aeropuerto–evento (km configurables). El total de los registrados se extiende al total de asistentes. |
| Alojamiento | Noches declaradas | Noches × factor por noche **definido en el evento, con su fuente**. Sin factor, no se suma. |
| Energía | kWh, litros, m³, kg | Cantidad × factor. Combustibles = alcance 1; electricidad = alcance 2. |
| Residuos | kg por destino y material | Emisiones del destino. Las evitadas por reciclaje se informan aparte y no se descuentan. |
| Catering, agua | kg, unidades, m³, L | Cantidad × factor |
| Infraestructura y otros | kgCO₂e medidos | Sin medición: 0,75 y 0,2 tCO₂e por cada 1.000 asistentes (marcado "estimado") |

**Asistentes considerados**: los reales (si se cargan en Configuración); si no, el mayor entre registrados y esperados.

**Alcances**: el informe separa alcance 1, 2 y 3 desde la perspectiva del organizador (GHG Protocol).

**Calidad del dato**: porcentaje de la huella medido o declarado, extendido desde las respuestas de asistentes y estimado.

**Evento Verde** (autoevaluación KONTAX Events, no es certificación de tercera parte): máx. 15 kgCO₂e por asistente
**sin vuelos**, mín. 60 % reciclaje/compostaje y mín. 30 % electricidad renovable.

## Cierre del evento e informes

- **Cerrar y emitir informe** congela los datos, los factores y el resultado en un informe numerado
  (`PR-HE-AAAA-NNNN`) con huella digital SHA-256 del contenido. El registro de asistentes se cierra.
- Con el evento cerrado no se pueden cambiar datos ni configuración. Cambiar `factores.js` no altera informes emitidos.
- Un administrador puede **reabrir**: el informe vigente queda como "reemplazado" y al volver a cerrar se emite uno nuevo.
- La supresión de datos de un asistente sigue permitida con el evento cerrado; el informe solo contiene cifras agregadas.
- El hash se puede recalcular desde la base con `hashSha256(snapshot)` (`server/src/lib/canonico.js`).

## Datos personales

- El registro exige consentimiento explícito y guarda la versión del texto y la fecha (`CONSENTIMIENTO_VERSION`).
- El consentimiento para comunicaciones es separado y opcional.
- Desde la pestaña **Asistentes** se pueden eliminar los datos de una persona (derecho de supresión).
- Los informes y el panel solo muestran cifras agregadas.
- Completa los textos entre corchetes de `/privacidad` y haz revisar la política por un abogado antes de publicar.

## Seguridad

- Contraseñas con bcrypt; sesión en cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción (8 horas).
- Límite de intentos en el login. En el registro público: 5 por correo cada 10 minutos y un tope alto por IP
  (`LIMITE_REGISTROS_POR_IP`, 600 por minuto), porque en un recinto todos comparten la misma IP del WiFi.
- En producción el servidor no arranca si `JWT_SECRET` tiene menos de 32 caracteres o `PUBLIC_URL` no es https.
- Apagado ordenado: al reiniciar termina las peticiones en curso antes de salir.
- Registro de auditoría (tabla `auditoria`): exportación de asistentes, supresión de datos, emisión y reapertura de
  informes, eliminación de eventos y cambios de usuarios.
- Las peticiones que modifican datos deben ser JSON; cabeceras de seguridad con Helmet y CSP.
- La exportación CSV neutraliza fórmulas para evitar inyección en Excel.

## Pendientes conocidos

- Textos entre corchetes en la landing (IVA, política de preinscripción, plazo, pymes por comuna, contacto).
- Preinscripción con pago Flow y KYC, pasaporte de socios y verificador de sello: aún no implementados
  (el botón de verificación está deshabilitado).
- Recuperación de contraseña por correo: hoy la restablece un administrador desde **Usuarios**.
