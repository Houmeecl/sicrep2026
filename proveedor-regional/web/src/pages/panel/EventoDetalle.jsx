import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
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
          titulo="Por asistente"
          valor={formato.numero(r.kg_por_asistente, 1)}
          unidad="kgCO₂e"
          nota={`Meta: máx. ${cr.kg_por_asistente.meta} kg`}
          tono={tonoCriterio(cr.kg_por_asistente)}
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
            Emisiones evitadas por reciclaje (informadas aparte): {formato.numero(r.residuos.emisiones_evitadas_tco2e, 2)} tCO₂e.
            Equivale a la absorción anual de unos {formato.numero(r.equivalencias.arboles_un_anio)} árboles.
          </p>
        </section>

        <section className="tarjeta flex flex-col gap-4 p-6">
          <h2 className="text-xl font-bold">QR de registro</h2>
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
          <h2 className="text-xl font-bold">Criterios Evento Verde</h2>
          <ul className="mt-3 divide-y divide-navy-900/8">
            {[
              [`Huella máx. ${cr.kg_por_asistente.meta} kgCO₂e por asistente`, cr.kg_por_asistente, ' kg'],
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
                        <button type="button" onClick={() => eliminar(r.id)} className="rounded-lg p-2 text-tinta-600 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar dato">
                          <Trash2 className="size-5" />
                        </button>
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
                  <td className="px-3 py-3">{NOMBRE_MODO[a.modo]}{a.modo === 'auto' && a.ocupantes > 1 ? ` (${a.ocupantes} pers.)` : ''}</td>
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
  const [f, setF] = useState({
    nombre: evento.nombre,
    ciudad: evento.ciudad,
    recinto: evento.recinto || '',
    fecha_inicio: evento.fecha_inicio || '',
    fecha_fin: evento.fecha_fin || '',
    dias: evento.dias,
    asistentes_estimados: evento.asistentes_estimados ?? '',
    asistentes_reales: evento.asistentes_reales ?? '',
    estado: evento.estado,
    registro_abierto: evento.registro_abierto,
  });
  const [mensaje, setMensaje] = useState(null);
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
      });
      setMensaje({ tipo: 'exito', texto: 'Cambios guardados.' });
      alGuardar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  async function eliminarEvento() {
    if (!confirm(`¿Eliminar "${evento.nombre}" con todos sus asistentes y datos? No se puede deshacer.`)) return;
    await api.del(`/eventos/${evento.id}`);
    navegar('/app/eventos', { replace: true });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <form onSubmit={guardar} className="tarjeta flex flex-col gap-5 p-6">
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Campo id="c-nombre" etiqueta="Nombre del evento">
              <input id="c-nombre" className="campo" value={f.nombre} onChange={c('nombre')} />
            </Campo>
          </div>
          <Campo id="c-ciudad" etiqueta="Ciudad"><input id="c-ciudad" className="campo" value={f.ciudad} onChange={c('ciudad')} /></Campo>
          <Campo id="c-recinto" etiqueta="Recinto"><input id="c-recinto" className="campo" value={f.recinto} onChange={c('recinto')} /></Campo>
          <Campo id="c-inicio" etiqueta="Fecha de inicio"><input id="c-inicio" type="date" className="campo" value={f.fecha_inicio} onChange={c('fecha_inicio')} /></Campo>
          <Campo id="c-fin" etiqueta="Fecha de término"><input id="c-fin" type="date" className="campo" value={f.fecha_fin} onChange={c('fecha_fin')} /></Campo>
          <Campo id="c-dias" etiqueta="Días de duración"><input id="c-dias" type="number" min="1" className="campo" value={f.dias} onChange={c('dias')} /></Campo>
          <Campo id="c-estado" etiqueta="Estado">
            <select id="c-estado" className="campo" value={f.estado} onChange={c('estado')}>
              {Object.entries(ESTADOS).map(([id, [n]]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </Campo>
          <Campo id="c-estimados" etiqueta="Asistentes esperados">
            <input id="c-estimados" type="number" min="0" className="campo" value={f.asistentes_estimados} onChange={c('asistentes_estimados')} />
          </Campo>
          <Campo id="c-reales" etiqueta="Asistentes reales (control de acceso)" ayuda="Si lo completas, reemplaza a los esperados en el cálculo.">
            <input id="c-reales" type="number" min="0" className="campo" value={f.asistentes_reales} onChange={c('asistentes_reales')} />
          </Campo>
        </div>
        <label className="flex items-center gap-3 font-semibold">
          <input type="checkbox" className="size-5 accent-navy-700" checked={f.registro_abierto} onChange={c('registro_abierto')} />
          Registro de asistentes abierto
        </label>
        <div>
          <button type="submit" className="boton-primario">Guardar cambios</button>
        </div>
      </form>

      {usuario.rol === 'admin' && (
        <section className="tarjeta flex flex-wrap items-center justify-between gap-4 border-red-200 p-6">
          <div>
            <h2 className="text-lg font-bold">Eliminar evento</h2>
            <p className="text-[15px] text-tinta-600">Borra el evento, sus asistentes y todos sus datos.</p>
          </div>
          <button type="button" onClick={eliminarEvento} className="boton border-2 border-red-700 text-red-700 hover:bg-red-50">
            <Trash2 className="size-4" aria-hidden="true" /> Eliminar
          </button>
        </section>
      )}
    </div>
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
  const { evento, resultado, url_registro: urlRegistro } = datos;
  const [estado, tono] = ESTADOS[evento.estado];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Link to="/app/eventos" className="flex w-fit items-center gap-1.5 font-semibold text-navy-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Eventos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        <a href={`/api/eventos/${evento.id}/informe.pdf`} className="boton-accion">
          <FileText className="size-5" aria-hidden="true" /> Descargar informe PDF
        </a>
      </div>

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
        {pestana === 'captura' && <Captura evento={evento} alCambiar={cargar} />}
        {pestana === 'asistentes' && <Asistentes evento={evento} alCambiar={cargar} />}
        {pestana === 'configuracion' && <Configuracion key={evento.id} evento={evento} alGuardar={cargar} />}
      </div>
    </div>
  );
}
