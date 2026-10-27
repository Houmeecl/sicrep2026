import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';
import { Aviso, Campo } from '../components/ui.jsx';
import { useSesion } from '../lib/sesion.jsx';

export default function Ingresar() {
  const { usuario, ingresar } = useSesion();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/app" replace />;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await ingresar(email, clave);
      navegar('/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,560px)_1fr]">
      <aside className="hidden flex-col justify-between bg-navy-900 p-14 text-white lg:flex">
        <Link to="/" aria-label="Volver al inicio">
          <Logo claro />
        </Link>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Tu panel de proveedor regional.</h1>
          <p className="mt-4 text-lg text-navy-100">
            Un solo acceso para socios, equipo de sostenibilidad y la fundación. Cada cuenta ve solo lo que le corresponde.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-navy-100">
            <li><strong className="text-white">Socios:</strong> pasaporte documental, sello y formación.</li>
            <li><strong className="text-white">Sostenibilidad:</strong> huella de eventos, asistentes e informes.</li>
            <li><strong className="text-white">Fundación:</strong> administración y usuarios.</li>
          </ul>
        </div>
        <p className="text-sm text-navy-100/80">Una iniciativa de Fundación Entretodos · Antofagasta</p>
      </aside>

      <main className="flex items-center justify-center bg-arena-100 px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <form onSubmit={enviar} className="tarjeta flex flex-col gap-5 p-8 sm:p-10" noValidate>
            <h2 className="text-3xl font-extrabold">Ingresar</h2>
            {error && <Aviso>{error}</Aviso>}
            <Campo id="email" etiqueta="Correo electrónico">
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="campo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Campo>
            <Campo id="clave" etiqueta="Contraseña">
              <input
                id="clave"
                type="password"
                autoComplete="current-password"
                className="campo"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </Campo>
            <button type="submit" className="boton-primario min-h-13 text-lg" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
            <p className="text-[15px] text-tinta-600">
              ¿Olvidaste tu contraseña? Pide a la fundación que la restablezca.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
