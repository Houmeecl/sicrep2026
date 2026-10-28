import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import { ProveedorSesion, useSesion } from './lib/sesion.jsx';
import { Cargando } from './components/ui.jsx';
import Landing from './pages/Landing.jsx';
import Ingresar from './pages/Ingresar.jsx';
import RegistroPublico from './pages/RegistroPublico.jsx';
import Privacidad from './pages/Privacidad.jsx';
import PanelLayout from './pages/panel/PanelLayout.jsx';
import Eventos from './pages/panel/Eventos.jsx';
import EventoDetalle from './pages/panel/EventoDetalle.jsx';
import Usuarios from './pages/panel/Usuarios.jsx';
import Cuenta from './pages/panel/Cuenta.jsx';
import InicioSocio from './pages/panel/InicioSocio.jsx';

function Protegida({ roles, children }) {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/ingresar" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/app" replace />;
  return children;
}

function InicioPanel() {
  const { usuario } = useSesion();
  return usuario.rol === 'socio' ? <InicioSocio /> : <Navigate to="/app/eventos" replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProveedorSesion>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/r/:slug" element={<RegistroPublico />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route
            path="/app"
            element={
              <Protegida>
                <PanelLayout />
              </Protegida>
            }
          >
            <Route index element={<InicioPanel />} />
            <Route
              path="eventos"
              element={
                <Protegida roles={['admin', 'sostenibilidad']}>
                  <Eventos />
                </Protegida>
              }
            />
            <Route
              path="eventos/:id"
              element={
                <Protegida roles={['admin', 'sostenibilidad']}>
                  <EventoDetalle />
                </Protegida>
              }
            />
            <Route
              path="usuarios"
              element={
                <Protegida roles={['admin']}>
                  <Usuarios />
                </Protegida>
              }
            />
            <Route path="cuenta" element={<Cuenta />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProveedorSesion>
  </StrictMode>,
);
