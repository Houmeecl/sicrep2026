import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api, formato } from '../../lib/api.js';
import { NOMBRE_ROL, useSesion } from '../../lib/sesion.jsx';
import { Aviso, Campo, Cargando, Insignia } from '../../components/ui.jsx';

const DESCRIPCION_ROL = {
  admin: 'Administra usuarios y todos los eventos.',
  sostenibilidad: 'Crea eventos, carga datos, ve asistentes e informes.',
  socio: 'Accede al panel de socio (pasaporte en desarrollo).',
};

function NuevoUsuario({ alCrear }) {
  const [f, setF] = useState({ nombre: '', email: '', rol: 'sostenibilidad', clave: '' });
  const [error, setError] = useState('');
  const c = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', f);
      setF({ nombre: '', email: '', rol: 'sostenibilidad', clave: '' });
      alCrear();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={enviar} className="tarjeta flex flex-col gap-4 p-6">
      <h2 className="text-xl font-bold">Crear usuario</h2>
      {error && <Aviso>{error}</Aviso>}
      <div className="grid gap-4 md:grid-cols-2">
        <Campo id="u-nombre" etiqueta="Nombre"><input id="u-nombre" className="campo" value={f.nombre} onChange={c('nombre')} /></Campo>
        <Campo id="u-email" etiqueta="Correo"><input id="u-email" type="email" className="campo" value={f.email} onChange={c('email')} /></Campo>
        <Campo id="u-rol" etiqueta="Rol" ayuda={DESCRIPCION_ROL[f.rol]}>
          <select id="u-rol" className="campo" value={f.rol} onChange={c('rol')}>
            {Object.entries(NOMBRE_ROL).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        </Campo>
        <Campo id="u-clave" etiqueta="Contraseña inicial" ayuda="Mínimo 10 caracteres. Entrégala por un canal seguro.">
          <input id="u-clave" type="text" autoComplete="off" className="campo" value={f.clave} onChange={c('clave')} />
        </Campo>
      </div>
      <div>
        <button type="submit" className="boton-primario"><UserPlus className="size-5" aria-hidden="true" /> Crear usuario</button>
      </div>
    </form>
  );
}

export default function Usuarios() {
  const { usuario: yo } = useSesion();
  const [usuarios, setUsuarios] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => api.get('/usuarios').then((d) => setUsuarios(d.usuarios)).catch((e) => setError(e.message)), []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  async function actualizar(u, cambios) {
    setError('');
    try {
      await api.patch(`/usuarios/${u.id}`, cambios);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function restablecer(u) {
    const clave = prompt(`Nueva contraseña para ${u.nombre} (mínimo 10 caracteres):`);
    if (clave) await actualizar(u, { clave });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="sobretitulo">Fundación</p>
        <h1 className="text-3xl font-extrabold">Usuarios</h1>
      </div>
      <NuevoUsuario alCrear={cargar} />
      {error && <Aviso>{error}</Aviso>}
      {!usuarios ? (
        <Cargando />
      ) : (
        <section className="tarjeta overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead className="bg-navy-50 text-sm text-tinta-600">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Usuario</th>
                <th scope="col" className="px-3 py-3 font-semibold">Rol</th>
                <th scope="col" className="px-3 py-3 font-semibold">Último ingreso</th>
                <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-3 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/8">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3"><span className="font-semibold">{u.nombre}</span><br /><span className="text-sm text-tinta-600">{u.email}</span></td>
                  <td className="px-3 py-3">
                    <label htmlFor={`rol-${u.id}`} className="sr-only">Rol de {u.nombre}</label>
                    <select id={`rol-${u.id}`} className="campo min-h-10 w-40" value={u.rol} disabled={u.id === yo.id} onChange={(e) => actualizar(u, { rol: e.target.value })}>
                      {Object.entries(NOMBRE_ROL).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-sm text-tinta-600">{formato.fechaHora(u.ultimo_ingreso)}</td>
                  <td className="px-3 py-3">{u.activo ? <Insignia tono="exito">Activo</Insignia> : <Insignia>Desactivado</Insignia>}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="boton-fantasma min-h-10 px-3 text-sm" onClick={() => restablecer(u)}>Restablecer clave</button>
                      {u.id !== yo.id && (
                        <button type="button" className="boton-fantasma min-h-10 px-3 text-sm" onClick={() => actualizar(u, { activo: !u.activo })}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
