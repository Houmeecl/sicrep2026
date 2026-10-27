import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays, House, LogOut, Menu, UserCog, Users, X } from 'lucide-react';
import { Logo } from '../../components/Logo.jsx';
import { Insignia } from '../../components/ui.jsx';
import { NOMBRE_ROL, useSesion } from '../../lib/sesion.jsx';

export default function PanelLayout() {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const enlaces = [
    usuario.rol === 'socio' && { a: '/app', t: 'Inicio', i: House, fin: true },
    ['admin', 'sostenibilidad'].includes(usuario.rol) && { a: '/app/eventos', t: 'Eventos', i: CalendarDays },
    usuario.rol === 'admin' && { a: '/app/usuarios', t: 'Usuarios', i: Users },
    { a: '/app/cuenta', t: 'Mi cuenta', i: UserCog },
  ].filter(Boolean);

  async function cerrar() {
    await salir();
    navegar('/ingresar', { replace: true });
  }

  const menu = (
    <nav aria-label="Panel" className="flex flex-col gap-1">
      {enlaces.map(({ a, t, i: Icono, fin }) => (
        <NavLink
          key={a}
          to={a}
          end={fin}
          onClick={() => setAbierto(false)}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold transition ${
              isActive ? 'bg-white/12 text-white' : 'text-navy-100 hover:bg-white/8 hover:text-white'
            }`
          }
        >
          <Icono className="size-5" aria-hidden="true" />
          {t}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-navy-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-navy-900 p-5 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <div className="flex flex-col gap-8">
          <Logo claro subtitulo={false} />
          {menu}
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 text-white">
          <div>
            <p className="font-semibold">{usuario.nombre}</p>
            <p className="truncate text-sm text-navy-100">{usuario.email}</p>
          </div>
          <Insignia tono="oscuro">{NOMBRE_ROL[usuario.rol]}</Insignia>
          <button type="button" onClick={cerrar} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-navy-100 hover:bg-white/8 hover:text-white">
            <LogOut className="size-5" aria-hidden="true" /> Salir
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 lg:hidden">
        <Logo claro subtitulo={false} />
        <button
          type="button"
          className="rounded-lg p-2 text-white hover:bg-white/10"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>
      {abierto && (
        <div className="bg-navy-900 px-4 pb-4 lg:hidden">
          {menu}
          <button type="button" onClick={cerrar} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-navy-100 hover:bg-white/8">
            <LogOut className="size-5" aria-hidden="true" /> Salir
          </button>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
