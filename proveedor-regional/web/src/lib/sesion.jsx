import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((d) => setUsuario(d.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const ingresar = useCallback(async (email, clave) => {
    const d = await api.post('/auth/login', { email, clave });
    setUsuario(d.usuario);
    return d.usuario;
  }, []);

  const salir = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUsuario(null);
  }, []);

  return (
    <ContextoSesion.Provider value={{ usuario, cargando, ingresar, salir }}>{children}</ContextoSesion.Provider>
  );
}

export const useSesion = () => useContext(ContextoSesion);

export const NOMBRE_ROL = {
  admin: 'Fundación',
  sostenibilidad: 'Sostenibilidad',
  socio: 'Socio',
};
