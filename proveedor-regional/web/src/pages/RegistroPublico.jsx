import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { api, formato } from '../lib/api.js';
import { Isotipo } from '../components/Logo.jsx';
import { Aviso, Campo, Cargando } from '../components/ui.jsx';

const INICIAL = {
  nombre: '',
  email: '',
  organizacion: '',
  perfil: '',
  origen: '',
  modo: '',
  modo_local: '',
  ocupantes: 1,
  noches: 0,
  consentimiento: false,
  acepta_comunicaciones: false,
};

export default function RegistroPublico() {
  const { slug } = useParams();
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [form, setForm] = useState(INICIAL);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);

  useEffect(() => {
    api.get(`/publico/eventos/${slug}`).then(setDatos).catch((e) => setErrorCarga(e.message));
  }, [slug]);

  const cambiar = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await api.post(`/publico/eventos/${slug}/registro`, {
        ...form,
        ocupantes: Number(form.ocupantes),
        noches: Number(form.noches),
        modo_local: form.modo === 'avion' && form.modo_local ? form.modo_local : null,
      });
      setListo(r.actualizado ? 'actualizado' : 'nuevo');
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError({ mensaje: err.message, campo: err.campo });
    } finally {
      setEnviando(false);
    }
  }

  if (errorCarga) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <Aviso>{errorCarga}</Aviso>
      </div>
    );
  }
  if (!datos) return <Cargando />;

  const { evento, opciones } = datos;
  const errorDe = (campo) => (error?.campo === campo ? error.mensaje : undefined);

  return (
    <div className="min-h-screen bg-arena-100">
      <header className="bg-navy-900 px-5 pb-7 pt-8 text-white">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-2">
            <Isotipo className="size-8" claro />
            <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-cobre-200">Proveedor Regional · Registro</span>
          </div>
          <h1 className="mt-4 text-[1.75rem] font-extrabold leading-tight">{evento.nombre}</h1>
          <p className="mt-1 text-navy-100">
            {evento.ciudad}
            {evento.recinto ? ` · ${evento.recinto}` : ''} · {formato.fecha(evento.fecha_inicio)}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 py-6">
        {listo ? (
          <div className="tarjeta flex flex-col items-center gap-3 p-8 text-center">
            <CircleCheck className="size-14 text-exito-700" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold">
              {listo === 'nuevo' ? '¡Asistencia registrada!' : 'Actualizamos tu registro'}
            </h2>
            <p className="text-tinta-600">
              Gracias por ayudarnos a medir la huella de carbono del evento. Tus respuestas de traslado se usan solo de
              forma agregada.
            </p>
          </div>
        ) : !evento.registro_abierto ? (
          <Aviso tipo="alerta">El registro de este evento está cerrado.</Aviso>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
            <p className="text-[15px] text-tinta-600">
              Registra tu asistencia en un minuto. Tus respuestas de traslado nos permiten calcular la huella de carbono del evento.
            </p>
            {error && !error.campo && <Aviso>{error.mensaje}</Aviso>}

            <fieldset className="tarjeta flex flex-col gap-4 p-5">
              <legend className="sr-only">Tus datos</legend>
              <Campo id="nombre" etiqueta="Nombre y apellido" error={errorDe('nombre')}>
                <input id="nombre" className="campo" autoComplete="name" value={form.nombre} onChange={cambiar('nombre')} required />
              </Campo>
              <Campo id="email" etiqueta="Correo electrónico" error={errorDe('email')}>
                <input id="email" type="email" className="campo" autoComplete="email" value={form.email} onChange={cambiar('email')} required />
              </Campo>
              <Campo id="organizacion" etiqueta="Organización (opcional)">
                <input id="organizacion" className="campo" autoComplete="organization" value={form.organizacion} onChange={cambiar('organizacion')} />
              </Campo>
              <Campo id="perfil" etiqueta="Participas como" error={errorDe('perfil')}>
                <select id="perfil" className="campo" value={form.perfil} onChange={cambiar('perfil')} required>
                  <option value="">Elige una opción</option>
                  {opciones.perfiles.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Campo>
            </fieldset>

            <fieldset className="tarjeta flex flex-col gap-4 p-5">
              <legend className="float-left mb-1 font-display text-lg font-bold">Tu traslado al evento</legend>
              <Campo id="origen" etiqueta="¿Desde dónde viajas?" error={errorDe('origen')}>
                <select id="origen" className="campo" value={form.origen} onChange={cambiar('origen')} required>
                  <option value="">Elige tu ciudad</option>
                  {opciones.origenes.map((g) => (
                    <optgroup key={g.grupo} label={g.grupo}>
                      {g.ciudades.map((o) => (
                        <option key={o.id} value={o.id}>{o.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Campo>

              <div role="radiogroup" aria-labelledby="modo-titulo">
                <p id="modo-titulo" className="etiqueta">¿Cómo llegaste principalmente?</p>
                <div className="flex flex-col gap-2">
                  {opciones.modos.map((m) => (
                    <label
                      key={m.id}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 transition ${
                        form.modo === m.id ? 'border-navy-700 bg-navy-50' : 'border-navy-900/12 bg-white hover:border-navy-700/40'
                      }`}
                    >
                      <input type="radio" name="modo" value={m.id} checked={form.modo === m.id} onChange={cambiar('modo')} className="size-5 accent-navy-700" />
                      {m.nombre}
                    </label>
                  ))}
                </div>
                {errorDe('modo') && <p className="mt-1 text-sm font-semibold text-red-700">{errorDe('modo')}</p>}
              </div>

              {form.modo === 'avion' && (
                <Campo id="modo_local" etiqueta="¿Cómo te trasladas entre el aeropuerto y el evento?">
                  <select id="modo_local" className="campo" value={form.modo_local} onChange={cambiar('modo_local')}>
                    <option value="">Elige una opción</option>
                    {opciones.modos_locales.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </Campo>
              )}

              {form.modo === 'auto' && (
                <Campo id="ocupantes" etiqueta="¿Cuántas personas venían en el auto, contándote?">
                  <select id="ocupantes" className="campo" value={form.ocupantes} onChange={cambiar('ocupantes')}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n === 1 ? 'Solo yo' : n === 5 ? '5 o más' : n}</option>
                    ))}
                  </select>
                </Campo>
              )}

              <Campo id="noches" etiqueta="Noches de alojamiento por el evento">
                <select id="noches" className="campo" value={form.noches} onChange={cambiar('noches')}>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n === 0 ? 'Ninguna' : n === 5 ? '5 o más' : n}</option>
                  ))}
                </select>
              </Campo>
            </fieldset>

            <fieldset className="tarjeta flex flex-col gap-3 p-5 text-[15px]">
              <legend className="sr-only">Consentimientos</legend>
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-navy-700" checked={form.consentimiento} onChange={cambiar('consentimiento')} />
                <span>
                  Acepto que Fundación Entretodos trate mis datos para el registro y el cálculo agregado de la huella del
                  evento, según la{' '}
                  <Link to="/privacidad" target="_blank" className="font-semibold text-navy-700 underline">política de privacidad</Link>.
                </span>
              </label>
              {errorDe('consentimiento') && <p className="text-sm font-semibold text-red-700">{errorDe('consentimiento')}</p>}
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-navy-700" checked={form.acepta_comunicaciones} onChange={cambiar('acepta_comunicaciones')} />
                <span>Quiero recibir información de Proveedor Regional (opcional).</span>
              </label>
            </fieldset>

            <button type="submit" className="boton-accion min-h-13 text-lg" disabled={enviando}>
              {enviando ? 'Registrando…' : 'Registrar asistencia'}
            </button>
            <p className="text-center text-sm text-tinta-600">
              Puedes pedir el acceso o la eliminación de tus datos en cualquier momento.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
