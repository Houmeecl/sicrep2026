import { useState } from 'react';
import { api } from '../../lib/api.js';
import { NOMBRE_ROL, useSesion } from '../../lib/sesion.jsx';
import { Aviso, Campo } from '../../components/ui.jsx';

export default function Cuenta() {
  const { usuario } = useSesion();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [mensaje, setMensaje] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setMensaje(null);
    try {
      await api.post('/auth/cambiar-clave', { actual, nueva });
      setActual('');
      setNueva('');
      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <p className="sobretitulo">{NOMBRE_ROL[usuario.rol]}</p>
        <h1 className="text-3xl font-extrabold">Mi cuenta</h1>
        <p className="mt-1 text-tinta-600">{usuario.nombre} · {usuario.email}</p>
      </div>
      <form onSubmit={enviar} className="tarjeta flex flex-col gap-4 p-6">
        <h2 className="text-xl font-bold">Cambiar contraseña</h2>
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        <Campo id="actual" etiqueta="Contraseña actual">
          <input id="actual" type="password" autoComplete="current-password" className="campo" value={actual} onChange={(e) => setActual(e.target.value)} />
        </Campo>
        <Campo id="nueva" etiqueta="Nueva contraseña" ayuda="Mínimo 10 caracteres.">
          <input id="nueva" type="password" autoComplete="new-password" className="campo" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </Campo>
        <div>
          <button type="submit" className="boton-primario">Actualizar contraseña</button>
        </div>
      </form>
    </div>
  );
}
