// Pruebas de integración de la API contra PostgreSQL real.
// Requiere TEST_DATABASE_URL apuntando a una base cuyo nombre contenga "test": la base se BORRA al comenzar.
//   TEST_DATABASE_URL=postgres://postgres@localhost/pr_test npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const omitir = !URL_PRUEBAS
  ? 'Define TEST_DATABASE_URL para ejecutar las pruebas de API'
  : !/test/i.test(new URL(URL_PRUEBAS).pathname)
    ? 'TEST_DATABASE_URL debe apuntar a una base con "test" en el nombre'
    : false;

let servidor;
let base;
let pool;

class Cliente {
  cookie = '';
  async pedir(metodo, ruta, cuerpo, { tipo } = {}) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;
    if (cuerpo !== undefined) headers['content-type'] = tipo || 'application/json';
    const res = await fetch(base + ruta, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    });
    const sc = res.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    const datos = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, datos, ct };
  }
  get = (r) => this.pedir('GET', r);
  post = (r, c = {}) => this.pedir('POST', r, c);
  patch = (r, c) => this.pedir('PATCH', r, c);
  del = (r) => this.pedir('DELETE', r);
}

const admin = new Cliente();
const sost = new Cliente();
const socio = new Cliente();
const anonimo = new Cliente();
let evento;

before(async () => {
  if (omitir) return;
  process.env.DATABASE_URL = URL_PRUEBAS;
  process.env.ADMIN_EMAIL = 'admin@prueba.cl';
  process.env.ADMIN_PASSWORD = 'clave-admin-prueba';
  process.env.PUBLIC_URL = 'https://prueba.cl';
  ({ pool } = await import('../src/db/pool.js'));
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const { migrar } = await import('../src/db/migrate.js');
  const { config } = await import('../src/config.js');
  config.adminEmail = process.env.ADMIN_EMAIL;
  config.adminPassword = process.env.ADMIN_PASSWORD;
  config.publicUrl = process.env.PUBLIC_URL;
  const { asegurarAdmin } = await import('../src/lib/auth.js');
  const { crearApp } = await import('../src/app.js');
  await migrar();
  await asegurarAdmin();
  await new Promise((ok) => {
    servidor = crearApp({ logs: false, dirWeb: '/no-existe' }).listen(0, ok);
  });
  base = `http://127.0.0.1:${servidor.address().port}/api`;
});

after(async () => {
  if (omitir) return;
  await new Promise((ok) => servidor.close(ok));
  await pool.end();
});

test('login: credenciales incorrectas y correctas', { skip: omitir }, async () => {
  assert.equal((await admin.post('/auth/login', { email: 'admin@prueba.cl', clave: 'mala' })).status, 401);
  const r = await admin.post('/auth/login', { email: 'ADMIN@prueba.cl', clave: 'clave-admin-prueba' });
  assert.equal(r.status, 200);
  assert.equal(r.datos.usuario.rol, 'admin');
  assert.equal((await admin.get('/auth/me')).datos.usuario.email, 'admin@prueba.cl');
  assert.equal((await anonimo.get('/auth/me')).datos.usuario, null);
});

test('rechaza peticiones que no son JSON', { skip: omitir }, async () => {
  const r = await anonimo.pedir('POST', '/auth/login', 'x', { tipo: 'text/plain' });
  assert.equal(r.status, 415);
});

test('usuarios y permisos por rol', { skip: omitir }, async () => {
  assert.equal((await admin.post('/usuarios', { nombre: 'X', email: 'x@prueba.cl', rol: 'socio', clave: 'corta' })).status, 400);
  assert.equal((await admin.post('/usuarios', { nombre: 'Sost', email: 'sost@prueba.cl', rol: 'sostenibilidad', clave: 'clave-sost-1234' })).status, 201);
  assert.equal((await admin.post('/usuarios', { nombre: 'Socio', email: 'socio@prueba.cl', rol: 'socio', clave: 'clave-socio-1234' })).status, 201);
  assert.equal((await admin.post('/usuarios', { nombre: 'Dup', email: 'SOCIO@prueba.cl', rol: 'socio', clave: 'clave-socio-1234' })).status, 409);

  await sost.post('/auth/login', { email: 'sost@prueba.cl', clave: 'clave-sost-1234' });
  await socio.post('/auth/login', { email: 'socio@prueba.cl', clave: 'clave-socio-1234' });
  assert.equal((await sost.get('/usuarios')).status, 403);
  assert.equal((await socio.get('/eventos')).status, 403);
  assert.equal((await anonimo.get('/eventos')).status, 401);
});

test('crear y editar evento', { skip: omitir }, async () => {
  const r = await sost.post('/eventos', { nombre: 'Encuentro OCDE de prueba', asistentes_estimados: 100, dias: 2 });
  assert.equal(r.status, 201);
  evento = r.datos.evento;
  assert.equal(evento.ciudad_base, 'antofagasta');
  assert.equal(evento.km_aeropuerto, 25);

  const p = await sost.patch(`/eventos/${evento.id}`, { recinto: 'Centro de eventos' });
  assert.equal(p.datos.evento.recinto, 'Centro de eventos');
  assert.equal(p.datos.evento.dias, 2, 'editar un campo no debe resetear otros');

  assert.equal((await sost.patch(`/eventos/${evento.id}`, { factor_alojamiento_kg_noche: 15 })).status, 400, 'exige fuente');
  assert.equal(
    (await sost.patch(`/eventos/${evento.id}`, { factor_alojamiento_kg_noche: 15, fuente_factor_alojamiento: 'Fuente de prueba' })).status,
    200,
  );
  assert.equal((await sost.patch(`/eventos/${evento.id}`, { estado: 'cerrado' })).status, 400);
  assert.equal((await sost.get('/eventos/no-es-uuid')).status, 404);
});

test('registro público por QR', { skip: omitir }, async () => {
  const pub = await anonimo.get(`/publico/eventos/${evento.slug}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.datos.evento.id, undefined, 'no expone el id interno');
  assert.ok(pub.datos.opciones.origenes.length > 3);

  const base = { nombre: 'Ana', email: 'ana@prueba.cl', perfil: 'Asistente', origen: 'calama', modo: 'auto', ocupantes: 2, noches: 1, consentimiento: true };
  assert.equal((await anonimo.post(`/publico/eventos/${evento.slug}/registro`, { ...base, consentimiento: false })).status, 400);
  assert.equal((await anonimo.post(`/publico/eventos/${evento.slug}/registro`, { ...base, extra: 1 })).status, 400, 'rechaza campos desconocidos');
  assert.equal((await anonimo.post(`/publico/eventos/${evento.slug}/registro`, base)).status, 201);
  const otra = await anonimo.post(`/publico/eventos/${evento.slug}/registro`, { ...base, email: 'ANA@prueba.cl', modo: 'bus' });
  assert.equal(otra.status, 200);
  assert.equal(otra.datos.actualizado, true);
  assert.equal(
    (await anonimo.post(`/publico/eventos/${evento.slug}/registro`, {
      ...base, nombre: 'John', email: 'john@prueba.org', origen: 'paris', modo: 'avion', modo_local: 'transfer', noches: 3,
    })).status,
    201,
  );

  const lista = await sost.get(`/eventos/${evento.id}/asistentes`);
  assert.equal(lista.datos.asistentes.length, 2);
  const john = lista.datos.asistentes.find((a) => a.nombre === 'John');
  assert.equal(john.modo_local, 'transfer');
  assert.equal(john.origen_nombre, 'París, Francia');
});

test('el límite por correo no bloquea a otros asistentes de la misma red', { skip: omitir }, async () => {
  for (let i = 0; i < 12; i++) {
    const r = await anonimo.post(`/publico/eventos/${evento.slug}/registro`, {
      nombre: `Persona ${i}`, email: `p${i}@red.cl`, perfil: 'Asistente', origen: 'antofagasta', modo: 'activo', consentimiento: true,
    });
    assert.equal(r.status, 201, `registro ${i}`);
  }
  let ultimo;
  for (let i = 0; i < 6; i++) {
    ultimo = await anonimo.post(`/publico/eventos/${evento.slug}/registro`, {
      nombre: 'Repetido', email: 'repetido@red.cl', perfil: 'Asistente', origen: 'antofagasta', modo: 'activo', consentimiento: true,
    });
  }
  assert.equal(ultimo.status, 429);
});

test('captura de datos, cálculo y exportaciones', { skip: omitir }, async () => {
  assert.equal((await sost.post(`/eventos/${evento.id}/registros`, { categoria: 'energia', subtipo: 'carne_vacuno', cantidad: 1 })).status, 400);
  assert.equal((await sost.post(`/eventos/${evento.id}/registros`, { categoria: 'energia', subtipo: 'electricidad_red', cantidad: -1 })).status, 400);
  assert.equal((await sost.post(`/eventos/${evento.id}/registros`, { categoria: 'energia', subtipo: 'electricidad_red', cantidad: 700 })).status, 201);
  assert.equal((await sost.post(`/eventos/${evento.id}/registros`, { categoria: 'energia', subtipo: 'diesel', cantidad: 50 })).status, 201);
  assert.equal((await sost.post(`/eventos/${evento.id}/registros`, { categoria: 'residuos', subtipo: 'reciclaje', cantidad: 30, material: 'plastico' })).status, 201);

  const d = await sost.get(`/eventos/${evento.id}`);
  const r = d.datos.resultado;
  assert.ok(r.total_tco2e > 0);
  assert.equal(r.asistentes.registrados, 15); // Ana, John, 12 de la misma red y 1 repetido
  assert.ok(r.transporte.vuelos_tco2e > 0);
  assert.ok(r.alcances[0].tco2e > 0 && r.alcances[1].tco2e > 0);
  assert.ok(r.categorias.find((c) => c.id === 'alojamiento').tco2e > 0);
  assert.equal(d.datos.url_registro, `https://prueba.cl/r/${evento.slug}`);

  const csv = await sost.get(`/eventos/${evento.id}/asistentes.csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.datos.toString('utf8'), /París, Francia/);

  const pdf = await sost.get(`/eventos/${evento.id}/informe.pdf`);
  assert.equal(pdf.ct, 'application/pdf');
  assert.equal(pdf.datos.subarray(0, 4).toString(), '%PDF');

  const qr = await sost.get(`/eventos/${evento.id}/qr.png`);
  assert.equal(qr.ct, 'image/png');
});

test('cerrar evento: congela datos y emite informe numerado con hash', { skip: omitir }, async () => {
  const { hashSha256 } = await import('../src/lib/canonico.js');
  const c = await sost.post(`/eventos/${evento.id}/cerrar`);
  assert.equal(c.status, 201);
  assert.match(c.datos.informe.numero, /^PR-HE-\d{4}-0001$/);
  assert.equal((await sost.post(`/eventos/${evento.id}/cerrar`)).status, 409, 'no se cierra dos veces');

  const { rows } = await pool.query('SELECT snapshot, hash_sha256 FROM informes WHERE numero = $1', [c.datos.informe.numero]);
  assert.equal(hashSha256(rows[0].snapshot), rows[0].hash_sha256, 'el hash se puede recalcular desde la base');
  assert.ok(!JSON.stringify(rows[0].snapshot).includes('ana@prueba.cl'), 'el informe no contiene datos personales');

  const antes = (await sost.get(`/eventos/${evento.id}`)).datos.resultado.total_tco2e;
  assert.equal((await sost.post(`/eventos/${evento.id}/registros`, { categoria: 'agua', subtipo: 'agua_red', cantidad: 5 })).status, 409);
  assert.equal((await sost.patch(`/eventos/${evento.id}`, { dias: 5 })).status, 409);
  assert.equal(
    (await anonimo.post(`/publico/eventos/${evento.slug}/registro`, {
      nombre: 'Tarde', email: 'tarde@prueba.cl', perfil: 'Asistente', origen: 'calama', modo: 'bus', consentimiento: true,
    })).status,
    409,
  );

  // La supresión de datos personales sigue permitida y no altera el informe emitido.
  const ana = (await sost.get(`/eventos/${evento.id}/asistentes`)).datos.asistentes.find((a) => a.nombre === 'Ana');
  assert.equal((await sost.del(`/eventos/${evento.id}/asistentes/${ana.id}`)).status, 200);
  assert.equal((await sost.get(`/eventos/${evento.id}`)).datos.resultado.total_tco2e, antes);

  const pdf = await sost.get(`/eventos/${evento.id}/informe.pdf`);
  assert.equal(pdf.datos.subarray(0, 4).toString(), '%PDF');

  const { rows: aud } = await pool.query('SELECT accion FROM auditoria ORDER BY id');
  const acciones = aud.map((a) => a.accion);
  for (const a of ['usuario.crear', 'asistentes.exportar', 'informe.emitir', 'asistente.suprimir']) assert.ok(acciones.includes(a), a);
});

test('reabrir es solo para administradores y reemplaza el informe', { skip: omitir }, async () => {
  assert.equal((await sost.post(`/eventos/${evento.id}/reabrir`)).status, 403);
  assert.equal((await admin.post(`/eventos/${evento.id}/reabrir`)).status, 200);
  const d = await admin.get(`/eventos/${evento.id}`);
  assert.equal(d.datos.evento.estado, 'finalizado');
  assert.equal(d.datos.informes[0].estado, 'reemplazado');
  const c = await admin.post(`/eventos/${evento.id}/cerrar`);
  assert.match(c.datos.informe.numero, /-0002$/);
});
