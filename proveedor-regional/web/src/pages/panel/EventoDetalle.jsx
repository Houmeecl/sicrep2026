import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Lock,
  LockOpen,
  ShieldCheck,
  Copy,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Trash2,
} from 'lucide-react';
import { api, formato } from '../../lib/api.js';
import { useSesion } from '../../lib/sesion.jsx';
import { Aviso, Campo, Cargando, Insignia } from '../../components/ui.jsx';
import { ESTADOS } from './Eventos.jsx';

const PESTANAS = [
  ['resumen', 'Resumen'],
  ['captura', 'Captura de datos'],
  ['asistentes', 'Asistentes'],
  ['configuracion', 'Configuración'],
];

const NOMBRE_MODO = { auto: 'Auto particular', bus: 'Bus o transporte público', taxi: 'Taxi o aplicación', avion: 'Avión', activo: 'A pie o bicicleta' };

function Kpi({ titulo, valor, unidad, nota, tono }) {
  const borde = { exito: 'border-t-exito-700', alerta: 'border-t-alerta-700' }[tono] || 'border-t-transparent';
  return (
    <div className={`tarjeta flex flex-col gap-1 border-t-4 p-5 ${borde}`}>
      <span className="text-sm font-semibold text-tinta-600">{titulo}</span>
      <span className="font-display text-3xl font-extrabold">
        {valor} {unidad && <span className="text-lg">{unidad}</span>}
      </span>
      {nota && (
        <span className={`text-sm font-semibold ${tono === 'alerta' ? 'text-alerta-700' : tono === 'exito' ? 'text-exito-700' : 'text-tinta-600'}`}>
          {nota}
        </span>
      )}
    </div>
  );
}

function tonoCriterio(c) {
  return c.cumple === null ? undefined : c.cumple ? 'exito' : 'alerta';
}

function Resumen({ evento, resultado: r, urlRegistro }) {
  const [copiado, setCopiado] = useState(false);
  const totalModos = Object.values(r.asistentes.modos).reduce((a, b) => a + b, 0);
  const cr = r.criterios;
  const faltantes = Object.entries(r.datos_completos).filter(([, ok]) => !ok).map(([k]) => k);

  async function copiar() {
    await navigator.clipboard.writeText(urlRegistro).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {r.asistentes.registrados > 0 && r.asistentes.cobertura_pct < 30 && (
        <Aviso tipo="alerta">
          Solo {formato.numero(r.asistentes.registrados)} de {formato.numero(r.asistentes.base)} asistentes han respondido
          ({formato.numero(r.asistentes.cobertura_pct)} %). El transporte se extiende desde esas respuestas, así que puede
          cambiar bastante a medida que lleguen más registros.
        </Aviso>
      )}
      {faltantes.length > 0 && (
        <Aviso tipo="info">
          Faltan datos de: <strong>{faltantes.map((k) => r.categorias.find((c) => c.id === k)?.nombre.toLowerCase()).join(', ')}</strong>.
          Las categorías sin medición usan estimaciones o quedan en cero.
        </Aviso>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          titulo="Asistentes registrados"
          valor={formato.numero(r.asistentes.registrados)}
          nota={`Base de cálculo: ${formato.numero(r.asistentes.base)}`}
        />
        <Kpi titulo="Huella total" valor={formato.numero(r.total_tco2e, 2)} unidad="tCO₂e" nota={`${formato.numero(r.tco2e_por_dia, 2)} t por día`} />
        <Kpi
          titulo="Por asistente, sin vuelos"
          valor={formato.numero(r.kg_por_asistente_sin_vuelos, 1)}
          unidad="kgCO₂e"
          nota={`Con vuelos: ${formato.numero(r.kg_por_asistente, 1)} kg · meta máx. ${cr.kg_por_asistente_sin_vuelos.meta} kg`}
          tono={tonoCriterio(cr.kg_por_asistente_sin_vuelos)}
        />
        <Kpi
          titulo="Reciclaje y compostaje"
          valor={cr.reciclaje_pct.valor === null ? '—' : `${formato.numero(cr.reciclaje_pct.valor)} %`}
          nota={`Meta: mín. ${cr.reciclaje_pct.meta} %`}
          tono={tonoCriterio(cr.reciclaje_pct)}
        />
        <Kpi
          titulo="Electricidad renovable"
          valor={cr.renovable_pct.valor === null ? '—' : `${formato.numero(cr.renovable_pct.valor)} %`}
          nota={`Meta: mín. ${cr.renovable_pct.meta} %`}
          tono={tonoCriterio(cr.renovable_pct)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="tarjeta p-6">
          <h2 className="text-xl font-bold">Huella por categoría</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {r.categorias.map((c) => (
              <li key={c.id}>
                <div className="flex justify-between gap-3 text-[15px]">
                  <span className="font-semibold">
                    {c.nombre} {c.estimado && <span className="font-normal text-tinta-600">(estimado)</span>}
                    {c.sin_factor && <span className="font-normal text-tinta-600">(sin factor: defínelo en Configuración)</span>}
                  </span>
                  <span>{formato.numero(c.tco2e, 2)} t · {formato.numero(c.porcentaje)} %</span>
                </div>
                <div className="mt-1.5 h-3 rounded-full bg-navy-50">
                  <div className="h-3 rounded-full bg-navy-700 transition-all" style={{ width: `${Math.max(c.porcentaje, c.tco2e > 0 ? 1 : 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-tinta-600">
            Del transporte, {formato.numero(r.transporte.vuelos_tco2e, 2)} t son vuelos y{' '}
            {formato.numero(r.transporte.terrestre_tco2e, 2)} t traslados terrestres.
          </p>
          <p className="mt-1 text-sm text-tinta-600">
            Emisiones evitadas por reciclaje (informadas aparte): {formato.numero(r.residuos.emisiones_evitadas_tco2e, 2)} tCO₂e.
            Equivale a la absorción anual de unos {formato.numero(r.equivalencias.arboles_un_anio)} árboles.
          </p>
        </section>

        <section className="tarjeta flex flex-col gap-4 p-6">
          <h2 className="text-xl font-bold">QR de registro</h2>
          {evento.estado === 'cerrado' && <Aviso tipo="info">El registro está cerrado porque el informe ya fue emitido.</Aviso>}
          <img src={`/api/eventos/${evento.id}/qr.png`} alt={`Código QR para registrarse en ${evento.nombre}`} className="mx-auto w-48 rounded-xl border border-navy-900/8" />
          <p className="break-all rounded-lg bg-navy-50 px-3 py-2 text-sm">{urlRegistro}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="boton-secundario flex-1" onClick={copiar}>
              <Copy className="size-4" aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar enlace'}
            </button>
            <a href={`/api/eventos/${evento.id}/qr.png`} download className="boton-secundario flex-1">
              <Download className="size-4" aria-hidden="true" /> Descargar QR
            </a>
            <a href={urlRegistro} target="_blank" rel="noreferrer" className="boton-fantasma w-full">
              <ExternalLink className="size-4" aria-hidden="true" /> Abrir formulario
            </a>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="tarjeta p-6">
          <h2 className="text-xl font-bold">Huella por alcance</h2>
          <p className="text-sm text-tinta-600">GHG Protocol, desde la perspectiva del organizador.</p>
          <ul className="mt-3 divide-y divide-navy-900/8">
            {r.alcances.map((a) => (
              <li key={a.alcance} className="flex justify-between gap-3 py-3">
                <span>{a.nombre}</span>
                <span className="whitespace-nowrap font-bold">{formato.numero(a.tco2e, 2)} t · {formato.numero(a.porcentaje)} %</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta p-6">
          <h2 className="text-xl font-bold">Calidad del dato</h2>
          <p className="text-sm text-tinta-600">De dónde proviene la huella calculada.</p>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-navy-50" aria-hidden="true">
            <div className="bg-navy-700" style={{ width: `${r.calidad.medido_pct}%` }} />
            <div className="bg-cobre-400" style={{ width: `${r.calidad.extendido_pct}%` }} />
            <div className="bg-tinta-400" style={{ width: `${r.calidad.estimado_pct}%` }} />
          </div>
          <ul className="mt-4 flex flex-col gap-2 text-[15px]">
            <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-navy-700" /> Medido o declarado: <strong>{formato.numero(r.calidad.medido_pct)} %</strong></li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-cobre-400" /> Extendido desde respuestas de asistentes: <strong>{formato.numero(r.calidad.extendido_pct)} %</strong></li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-sm bg-tinta-400" /> Estimado sin medición: <strong>{formato.numero(r.calidad.estimado_pct)} %</strong></li>
          </ul>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="tarjeta p-6">
          <h2 className="text-xl font-bold">Criterios Evento Verde</h2>
          <ul className="mt-3 divide-y divide-navy-900/8">
            {[
              [`Huella sin vuelos máx. ${cr.kg_por_asistente_sin_vuelos.meta} kgCO₂e por asistente`, cr.kg_por_asistente_sin_vuelos, ' kg'],
              [`Reciclaje y compostaje mín. ${cr.reciclaje_pct.meta} %`, cr.reciclaje_pct, ' %'],
              [`Electricidad renovable mín. ${cr.renovable_pct.meta} %`, cr.renovable_pct, ' %'],
            ].map(([t, c, u]) => (
              <li key={t} className="flex justify-between gap-3 py-3">
                <span>{t}</span>
                <span className={`font-bold ${c.cumple === null ? 'text-tinta-600' : c.cumple ? 'text-exito-700' : 'text-alerta-700'}`}>
                  {c.valor === null ? 'Sin datos' : `${formato.numero(c.valor, 1)}${u} ${c.cumple ? '✓' : '✗'}`}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            {r.evento_verde ? (
              <Insignia tono="exito">Cumple Evento Verde</Insignia>
            ) : (
              <Insignia tono="alerta">Aún no cumple Evento Verde</Insignia>
            )}
          </div>
          <p className="mt-3 text-sm text-tinta-600">
            Autoevaluación según KONTAX Events; no es una certificación de tercera parte. El criterio por asistente excluye
            vuelos, que el organizador no controla.
          </p>
        </section>

        <section className="tarjeta p-6">
          <h2 className="text-xl font-bold">Cómo llegaron los asistentes</h2>
          <p className="text-sm text-tinta-600">Calculado automáticamente desde el registro por QR.</p>
          {totalModos === 0 ? (
            <p className="mt-4 text-tinta-600">Aún no hay registros.</p>
          ) : (
            <ul className="mt-3 divide-y divide-navy-900/8">
              {Object.entries(NOMBRE_MODO).map(([id, nombre]) => {
                const n = r.asistentes.modos[id] || 0;
                return (
                  <li key={id} className="flex justify-between py-2.5">
                    <span>{nombre}</span>
                    <span className="font-bold">{formato.numero((n / totalModos) * 100)} % <span className="font-normal text-tinta-600">({n})</span></span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Captura({ evento, alCambiar }) {
  const [catalogos, setCatalogos] = useState(null);
  const [registros, setRegistros] = useState(null);
  const [f, setF] = useState({ categoria: 'energia', subtipo: 'electricidad_red', cantidad: '', material: 'mixto', nota: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => api.get(`/eventos/${evento.id}/registros`).then((d) => setRegistros(d.registros)), [evento.id]);

  useEffect(() => {
    api.get('/eventos/catalogos').then(setCatalogos);
    cargar();
  }, [cargar]);

  if (!catalogos || !registros) return <Cargando />;
  const { subtipos, categorias, materiales } = catalogos;
  const categoriasCaptura = categorias.filter((c) => subtipos[c.id]);
  const unidad = subtipos[f.categoria]?.[f.subtipo]?.unidad;

  function cambiarCategoria(e) {
    const categoria = e.target.value;
    setF({ ...f, categoria, subtipo: Object.keys(subtipos[categoria])[0] });
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api.post(`/eventos/${evento.id}/registros`, {
        categoria: f.categoria,
        subtipo: f.subtipo,
        cantidad: Number(f.cantidad),
        ...(f.categoria === 'residuos' ? { material: f.material } : {}),
        ...(f.nota ? { nota: f.nota } : {}),
      });
      setF({ ...f, cantidad: '', nota: '' });
      await cargar();
      alCambiar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este dato?')) return;
    await api.del(`/eventos/${evento.id}/registros/${id}`);
    await cargar();
    alCambiar();
  }

  const nombreCategoria = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
      {evento.estado === 'cerrado' ? (
        <div className="tarjeta flex flex-col gap-3 p-6">
          <h2 className="text-xl font-bold">Datos congelados</h2>
          <Aviso tipo="info">
            El evento está cerrado y su informe ya fue emitido. Para corregir datos, un administrador debe reabrirlo; se
            emitirá un informe nuevo que reemplaza al anterior.
          </Aviso>
        </div>
      ) : (
      <form onSubmit={enviar} className="tarjeta flex flex-col gap-4 p-6">
        <h2 className="text-xl font-bold">Agregar dato</h2>
        {error && <Aviso>{error}</Aviso>}
        <Campo id="categoria" etiqueta="Categoría">
          <select id="categoria" className="campo" value={f.categoria} onChange={cambiarCategoria}>
            {categoriasCaptura.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo id="subtipo" etiqueta="Tipo">
          <select id="subtipo" className="campo" value={f.subtipo} onChange={(e) => setF({ ...f, subtipo: e.target.value })}>
            {Object.entries(subtipos[f.categoria]).map(([id, s]) => (
              <option key={id} value={id}>{s.nombre}</option>
            ))}
          </select>
        </Campo>
        {f.categoria === 'residuos' && (
          <Campo id="material" etiqueta="Material">
            <select id="material" className="campo" value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })}>
              {Object.entries(materiales).map(([id, n]) => (
                <option key={id} value={id}>{n}</option>
              ))}
            </select>
          </Campo>
        )}
        <Campo id="cantidad" etiqueta={`Cantidad (${unidad})`}>
          <input id="cantidad" type="number" min="0" step="any" inputMode="decimal" className="campo" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} required />
        </Campo>
        <Campo id="nota" etiqueta="Nota o respaldo (opcional)" ayuda="Ej.: lectura de medidor del día 1, guía de despacho N° 123.">
          <input id="nota" className="campo" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} maxLength={300} />
        </Campo>
        <button type="submit" className="boton-primario" disabled={enviando || f.cantidad === ''}>
          {enviando ? 'Guardando…' : 'Guardar dato'}
        </button>
      </form>
      )}

      <section className="tarjeta overflow-hidden">
        <h2 className="px-6 pt-6 text-xl font-bold">Datos cargados</h2>
        {registros.length === 0 ? (
          <p className="px-6 pb-6 pt-2 text-tinta-600">Aún no hay datos operativos. El transporte se calcula solo desde el registro de asistentes.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead className="bg-navy-50 text-sm text-tinta-600">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold">Categoría</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Tipo</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Cantidad</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Registrado</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                {registros.map((r) => {
                  const s = subtipos[r.categoria]?.[r.subtipo];
                  return (
                    <tr key={r.id}>
                      <td className="px-6 py-3">{nombreCategoria[r.categoria]}</td>
                      <td className="px-3 py-3">
                        {s?.nombre || r.subtipo}
                        {r.detalle?.material && <span className="text-tinta-600"> · {materiales[r.detalle.material]}</span>}
                        {r.nota && <p className="text-sm text-tinta-600">{r.nota}</p>}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{formato.numero(r.cantidad, 1)} {s?.unidad}</td>
                      <td className="px-3 py-3 text-sm text-tinta-600">{formato.fechaHora(r.creado_en)}<br />{r.creado_por}</td>
                      <td className="px-3 py-3 text-right">
                        {evento.estado !== 'cerrado' && (
                          <button type="button" onClick={() => eliminar(r.id)} className="rounded-lg p-2 text-tinta-600 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar dato">
                            <Trash2 className="size-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Asistentes({ evento, alCambiar }) {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(() => api.get(`/eventos/${evento.id}/asistentes`).then((d) => setLista(d.asistentes)), [evento.id]);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!lista || !q) return lista;
    return lista.filter((a) => [a.nombre, a.email, a.organizacion].some((v) => v?.toLowerCase().includes(q)));
  }, [lista, filtro]);

  async function eliminar(a) {
    if (!confirm(`¿Eliminar los datos de ${a.nombre}? Esta acción no se puede deshacer.`)) return;
    await api.del(`/eventos/${evento.id}/asistentes/${a.id}`);
    await cargar();
    alCambiar();
  }

  if (!lista) return <Cargando />;
  return (
    <section className="tarjeta overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
          <h2 className="text-xl font-bold">{formato.numero(lista.length)} asistentes registrados</h2>
          <p className="text-sm text-tinta-600">Eliminar un asistente atiende una solicitud de supresión de datos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="buscar" className="sr-only">Buscar asistente</label>
          <input id="buscar" className="campo w-64" placeholder="Buscar por nombre, correo u organización" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <a href={`/api/eventos/${evento.id}/asistentes.csv`} className="boton-secundario">
            <Download className="size-4" aria-hidden="true" /> Exportar CSV
          </a>
        </div>
      </div>
      {lista.length === 0 ? (
        <p className="px-6 pb-6 text-tinta-600">Aún no hay registros. Comparte el QR del evento para comenzar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead className="bg-navy-50 text-sm text-tinta-600">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Nombre</th>
                <th scope="col" className="px-3 py-3 font-semibold">Organización</th>
                <th scope="col" className="px-3 py-3 font-semibold">Participa como</th>
                <th scope="col" className="px-3 py-3 font-semibold">Traslado</th>
                <th scope="col" className="px-3 py-3 font-semibold">Registro</th>
                <th scope="col" className="px-3 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/8">
              {visibles.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-3"><span className="font-semibold">{a.nombre}</span><br /><span className="text-sm text-tinta-600">{a.email}</span></td>
                  <td className="px-3 py-3">{a.organizacion || '—'}</td>
                  <td className="px-3 py-3">{a.perfil}</td>
                  <td className="px-3 py-3">{NOMBRE_MODO[a.modo]}{a.modo === 'auto' && a.ocupantes > 1 ? ` (${a.ocupantes} pers.)` : ''}<br /><span className="text-sm text-tinta-600">desde {a.origen_nombre}</span></td>
                  <td className="px-3 py-3 text-sm text-tinta-600">{formato.fechaHora(a.creado_en)}</td>
                  <td className="px-3 py-3 text-right">
                    <button type="button" onClick={() => eliminar(a)} className="rounded-lg p-2 text-tinta-600 hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar a ${a.nombre}`}>
                      <Trash2 className="size-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


function Configuracion({ evento, alGuardar }) {
  const { usuario } = useSesion();
  const navegar = useNavigate();
  const cerrado = evento.estado === 'cerrado';
  const [sedes, setSedes] = useState([]);
  const [f, setF] = useState({
    nombre: evento.nombre,
    ciudad: evento.ciudad,
    ciudad_base: evento.ciudad_base,
    recinto: evento.recinto || '',
    fecha_inicio: evento.fecha_inicio || '',
    fecha_fin: evento.fecha_fin || '',
    dias: evento.dias,
    asistentes_estimados: evento.asistentes_estimados ?? '',
    asistentes_reales: evento.asistentes_reales ?? '',
    km_aeropuerto: evento.km_aeropuerto ?? 25,
    factor_alojamiento_kg_noche: evento.factor_alojamiento_kg_noche ?? '',
    fuente_factor_alojamiento: evento.fuente_factor_alojamiento || '',
    estado: cerrado ? 'finalizado' : evento.estado,
    registro_abierto: evento.registro_abierto,
  });
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    api.get('/eventos/catalogos').then((d) => setSedes(d.sedes));
  }, []);

  const c = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const numOrNull = (v) => (v === '' ? null : Number(v));

  async function guardar(e) {
    e.preventDefault();
    setMensaje(null);
    try {
      await api.patch(`/eventos/${evento.id}`, {
        ...f,
        recinto: f.recinto || null,
        fecha_inicio: f.fecha_inicio || null,
        fecha_fin: f.fecha_fin || null,
        dias: Number(f.dias),
        asistentes_estimados: numOrNull(f.asistentes_estimados),
        asistentes_reales: numOrNull(f.asistentes_reales),
        km_aeropuerto: Number(f.km_aeropuerto),
        factor_alojamiento_kg_noche: numOrNull(f.factor_alojamiento_kg_noche),
        fuente_factor_alojamiento: f.fuente_factor_alojamiento || null,
      });
      setMensaje({ tipo: 'exito', texto: 'Cambios guardados.' });
      alGuardar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  async function reabrir() {
    if (!confirm('¿Reabrir el evento? El informe vigente quedará como reemplazado y al volver a cerrar se emitirá uno nuevo.')) return;
    try {
      await api.post(`/eventos/${evento.id}/reabrir`);
      alGuardar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  async function eliminarEvento() {
    if (!confirm(`¿Eliminar "${evento.nombre}" con todos sus asistentes, datos e informes? No se puede deshacer.`)) return;
    await api.del(`/eventos/${evento.id}`);
    navegar('/app/eventos', { replace: true });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {cerrado && (
        <section className="tarjeta flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-lg font-bold">Evento cerrado</h2>
            <p className="text-[15px] text-tinta-600">
              La configuración está bloqueada para que el informe emitido no cambie.
              {usuario.rol !== 'admin' && ' Solo un administrador puede reabrirlo.'}
            </p>
          </div>
          {usuario.rol === 'admin' && (
            <button type="button" onClick={reabrir} className="boton-secundario">
              <LockOpen className="size-4" aria-hidden="true" /> Reabrir evento
            </button>
          )}
        </section>
      )}

      <form onSubmit={guardar} className="tarjeta flex flex-col gap-5 p-6">
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        <fieldset disabled={cerrado} className="flex flex-col gap-5 disabled:opacity-70">
          <legend className="sr-only">Datos del evento</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Campo id="c-nombre" etiqueta="Nombre del evento">
                <input id="c-nombre" className="campo" value={f.nombre} onChange={c('nombre')} />
              </Campo>
            </div>
            <Campo id="c-ciudad" etiqueta="Ciudad (como se muestra)"><input id="c-ciudad" className="campo" value={f.ciudad} onChange={c('ciudad')} /></Campo>
            <Campo id="c-sede" etiqueta="Ciudad sede para calcular distancias">
              <select id="c-sede" className="campo" value={f.ciudad_base} onChange={c('ciudad_base')}>
                {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Campo>
            <Campo id="c-recinto" etiqueta="Recinto"><input id="c-recinto" className="campo" value={f.recinto} onChange={c('recinto')} /></Campo>
            <Campo id="c-estado" etiqueta="Estado">
              <select id="c-estado" className="campo" value={f.estado} onChange={c('estado')}>
                {Object.entries(ESTADOS).filter(([id]) => id !== 'cerrado').map(([id, [n]]) => <option key={id} value={id}>{n}</option>)}
              </select>
            </Campo>
            <Campo id="c-inicio" etiqueta="Fecha de inicio"><input id="c-inicio" type="date" className="campo" value={f.fecha_inicio} onChange={c('fecha_inicio')} /></Campo>
            <Campo id="c-fin" etiqueta="Fecha de término"><input id="c-fin" type="date" className="campo" value={f.fecha_fin} onChange={c('fecha_fin')} /></Campo>
            <Campo id="c-dias" etiqueta="Días de duración"><input id="c-dias" type="number" min="1" className="campo" value={f.dias} onChange={c('dias')} /></Campo>
            <Campo id="c-estimados" etiqueta="Asistentes esperados">
              <input id="c-estimados" type="number" min="0" className="campo" value={f.asistentes_estimados} onChange={c('asistentes_estimados')} />
            </Campo>
            <Campo id="c-reales" etiqueta="Asistentes reales (control de acceso)" ayuda="Si lo completas, reemplaza a los esperados en el cálculo.">
              <input id="c-reales" type="number" min="0" className="campo" value={f.asistentes_reales} onChange={c('asistentes_reales')} />
            </Campo>
          </div>

          <div className="flex flex-col gap-4 border-t border-navy-900/8 pt-5">
            <h3 className="text-lg font-bold">Parámetros del cálculo</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Campo id="c-aeropuerto" etiqueta="Distancia aeropuerto – evento (km, solo ida)" ayuda="Se suma a quienes llegan en avión.">
                <input id="c-aeropuerto" type="number" min="0" step="any" className="campo" value={f.km_aeropuerto} onChange={c('km_aeropuerto')} />
              </Campo>
              <Campo id="c-aloj" etiqueta="Factor de alojamiento (kgCO₂e por noche)" ayuda="Déjalo vacío para no incluir alojamiento.">
                <input id="c-aloj" type="number" min="0" step="any" className="campo" value={f.factor_alojamiento_kg_noche} onChange={c('factor_alojamiento_kg_noche')} />
              </Campo>
              <div className="md:col-span-2">
                <Campo id="c-fuente" etiqueta="Fuente del factor de alojamiento" ayuda="Obligatoria si ingresas un factor. Queda impresa en el informe.">
                  <input id="c-fuente" className="campo" value={f.fuente_factor_alojamiento} onChange={c('fuente_factor_alojamiento')} maxLength={300} />
                </Campo>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 font-semibold">
            <input type="checkbox" className="size-5 accent-navy-700" checked={f.registro_abierto} onChange={c('registro_abierto')} />
            Registro de asistentes abierto
          </label>
          <div>
            <button type="submit" className="boton-primario">Guardar cambios</button>
          </div>
        </fieldset>
      </form>

      {usuario.rol === 'admin' && (
        <section className="tarjeta flex flex-wrap items-center justify-between gap-4 border-red-200 p-6">
          <div>
            <h2 className="text-lg font-bold">Eliminar evento</h2>
            <p className="text-[15px] text-tinta-600">Borra el evento, sus asistentes, sus datos y sus informes.</p>
          </div>
          <button type="button" onClick={eliminarEvento} className="boton border-2 border-red-700 text-red-700 hover:bg-red-50">
            <Trash2 className="size-4" aria-hidden="true" /> Eliminar
          </button>
        </section>
      )}
    </div>
  );
}

function Informes({ evento, informes, alCambiar }) {
  const [error, setError] = useState('');
  const [cerrando, setCerrando] = useState(false);
  const vigente = informes.find((i) => i.estado === 'vigente');

  async function cerrar() {
    if (
      !confirm(
        'Al cerrar el evento se congelan los datos, se cierra el registro de asistentes y se emite un informe numerado. ¿Continuar?',
      )
    )
      return;
    setError('');
    setCerrando(true);
    try {
      await api.post(`/eventos/${evento.id}/cerrar`);
      alCambiar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCerrando(false);
    }
  }

  return (
    <section className="tarjeta flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Informe</h2>
          {vigente ? (
            <p className="text-[15px] text-tinta-600">
              Informe vigente <strong className="text-navy-900">N° {vigente.numero}</strong>, emitido el{' '}
              {formato.fechaHora(vigente.emitido_en)} por {vigente.emitido_por || '—'}.
            </p>
          ) : (
            <p className="text-[15px] text-tinta-600">
              Mientras el evento está abierto puedes descargar un borrador. Al cerrarlo se emite un informe numerado que ya no cambia.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/eventos/${evento.id}/informe.pdf`} className={vigente ? 'boton-accion' : 'boton-secundario'}>
            <FileText className="size-5" aria-hidden="true" /> {vigente ? 'Descargar informe' : 'Descargar borrador'}
          </a>
          {!vigente && (
            <button type="button" className="boton-accion" onClick={cerrar} disabled={cerrando}>
              <Lock className="size-5" aria-hidden="true" /> {cerrando ? 'Emitiendo…' : 'Cerrar y emitir informe'}
            </button>
          )}
        </div>
      </div>
      {error && <Aviso>{error}</Aviso>}
      {vigente && (
        <p className="flex items-start gap-2 break-all rounded-lg bg-navy-50 px-3 py-2 font-mono text-xs text-tinta-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-exito-700" aria-hidden="true" />
          SHA-256: {vigente.hash_sha256}
        </p>
      )}
      {informes.length > (vigente ? 1 : 0) && (
        <details>
          <summary className="cursor-pointer font-semibold text-navy-700">Informes anteriores</summary>
          <ul className="mt-2 divide-y divide-navy-900/8">
            {informes
              .filter((i) => i.estado !== 'vigente')
              .map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[15px]">
                  <span>
                    N° {i.numero} · {formato.fechaHora(i.emitido_en)} <Insignia>Reemplazado</Insignia>
                  </span>
                  <a href={`/api/eventos/${evento.id}/informes/${i.id}.pdf`} className="font-semibold text-navy-700 hover:underline">
                    Descargar
                  </a>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default function EventoDetalle() {
  const { id } = useParams();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState('resumen');

  const cargar = useCallback(
    () => api.get(`/eventos/${id}`).then(setDatos).catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <Aviso>{error}</Aviso>;
  if (!datos) return <Cargando />;
  const { evento, resultado, url_registro: urlRegistro, informes } = datos;
  const [estado, tono] = ESTADOS[evento.estado];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Link to="/app/eventos" className="flex w-fit items-center gap-1.5 font-semibold text-navy-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Eventos
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Insignia tono={tono}>{estado}</Insignia>
          <Insignia>{evento.registro_abierto ? 'Registro abierto' : 'Registro cerrado'}</Insignia>
        </div>
        <h1 className="text-3xl font-extrabold">{evento.nombre}</h1>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-tinta-600">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />{formato.fecha(evento.fecha_inicio)}</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{evento.ciudad}{evento.recinto ? ` · ${evento.recinto}` : ''}</span>
        </p>
      </div>

      <Informes key={`${evento.estado}-${informes.length}`} evento={evento} informes={informes} alCambiar={cargar} />

      <div role="tablist" aria-label="Secciones del evento" className="flex gap-1 overflow-x-auto border-b border-navy-900/10">
        {PESTANAS.map(([idP, nombre]) => (
          <button
            key={idP}
            type="button"
            role="tab"
            aria-selected={pestana === idP}
            onClick={() => setPestana(idP)}
            className={`min-h-11 whitespace-nowrap border-b-[3px] px-4 font-semibold transition ${
              pestana === idP ? 'border-naranjo-500 text-navy-900' : 'border-transparent text-tinta-600 hover:text-navy-900'
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {pestana === 'resumen' && <Resumen evento={evento} resultado={resultado} urlRegistro={urlRegistro} />}
        {pestana === 'captura' && <Captura key={evento.estado} evento={evento} alCambiar={cargar} />}
        {pestana === 'asistentes' && <Asistentes evento={evento} alCambiar={cargar} />}
        {pestana === 'configuracion' && <Configuracion key={`${evento.id}-${evento.estado}-${evento.actualizado_en}`} evento={evento} alGuardar={cargar} />}
      </div>
    </div>
  );
}
