import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react';
import { api, formato } from '../../lib/api.js';
import { Aviso, Campo, Cargando, Insignia } from '../../components/ui.jsx';

export const ESTADOS = {
  planificacion: ['Planificación', 'neutro'],
  en_curso: ['En curso', 'exito'],
  finalizado: ['Finalizado', 'cobre'],
};

function FormularioNuevo({ alCancelar }) {
  const navegar = useNavigate();
  const [f, setF] = useState({
    nombre: '',
    ciudad: 'Antofagasta',
    recinto: '',
    fecha_inicio: '',
    fecha_fin: '',
    dias: 1,
    asistentes_estimados: '',
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { evento } = await api.post('/eventos', {
        ...f,
        recinto: f.recinto || null,
        fecha_inicio: f.fecha_inicio || null,
        fecha_fin: f.fecha_fin || null,
        asistentes_estimados: f.asistentes_estimados === '' ? null : Number(f.asistentes_estimados),
        dias: Number(f.dias),
      });
      navegar(`/app/eventos/${evento.id}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="tarjeta flex flex-col gap-5 p-6">
      <h2 className="text-xl font-bold">Nuevo evento</h2>
      {error && <Aviso>{error}</Aviso>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Campo id="nombre" etiqueta="Nombre del evento">
            <input id="nombre" className="campo" value={f.nombre} onChange={c('nombre')} placeholder="Encuentro OCDE de Regiones Mineras" required />
          </Campo>
        </div>
        <Campo id="ciudad" etiqueta="Ciudad">
          <input id="ciudad" className="campo" value={f.ciudad} onChange={c('ciudad')} />
        </Campo>
        <Campo id="recinto" etiqueta="Recinto">
          <input id="recinto" className="campo" value={f.recinto} onChange={c('recinto')} />
        </Campo>
        <Campo id="fecha_inicio" etiqueta="Fecha de inicio">
          <input id="fecha_inicio" type="date" className="campo" value={f.fecha_inicio} onChange={c('fecha_inicio')} />
        </Campo>
        <Campo id="fecha_fin" etiqueta="Fecha de término">
          <input id="fecha_fin" type="date" className="campo" value={f.fecha_fin} onChange={c('fecha_fin')} />
        </Campo>
        <Campo id="dias" etiqueta="Días de duración">
          <input id="dias" type="number" min="1" className="campo" value={f.dias} onChange={c('dias')} />
        </Campo>
        <Campo id="asistentes_estimados" etiqueta="Asistentes esperados" ayuda="Se usa para extender el cálculo mientras llegan los registros.">
          <input id="asistentes_estimados" type="number" min="0" className="campo" value={f.asistentes_estimados} onChange={c('asistentes_estimados')} />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="boton-primario" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear evento'}
        </button>
        <button type="button" className="boton-fantasma" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Eventos() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    api.get('/eventos').then((d) => setEventos(d.eventos)).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="sobretitulo">Sostenibilidad</p>
          <h1 className="text-3xl font-extrabold">Eventos</h1>
        </div>
        {!creando && (
          <button type="button" className="boton-accion" onClick={() => setCreando(true)}>
            <Plus className="size-5" aria-hidden="true" /> Nuevo evento
          </button>
        )}
      </div>

      {creando && <FormularioNuevo alCancelar={() => setCreando(false)} />}
      {error && <Aviso>{error}</Aviso>}
      {!eventos && !error && <Cargando />}

      {eventos?.length === 0 && !creando && (
        <div className="tarjeta flex flex-col items-center gap-3 p-12 text-center">
          <CalendarDays className="size-10 text-navy-700" aria-hidden="true" />
          <h2 className="text-xl font-bold">Aún no hay eventos</h2>
          <p className="max-w-md text-tinta-600">Crea el primero para generar su QR de registro y comenzar a medir su huella.</p>
          <button type="button" className="boton-primario mt-2" onClick={() => setCreando(true)}>
            Crear evento
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {eventos?.map((e) => {
          const [estado, tono] = ESTADOS[e.estado];
          return (
            <Link key={e.id} to={`/app/eventos/${e.id}`} className="tarjeta group flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-wrap gap-2">
                <Insignia tono={tono}>{estado}</Insignia>
                {!e.registro_abierto && <Insignia>Registro cerrado</Insignia>}
              </div>
              <h2 className="text-xl font-bold group-hover:text-navy-700">{e.nombre}</h2>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-tinta-600">
                <span className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />{formato.fecha(e.fecha_inicio)}</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{e.ciudad}{e.recinto ? ` · ${e.recinto}` : ''}</span>
                <span className="flex items-center gap-1.5"><Users className="size-4" aria-hidden="true" />{formato.numero(e.registrados)} registrados</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
