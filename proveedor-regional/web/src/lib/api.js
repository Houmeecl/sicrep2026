// Cliente HTTP mínimo para la API (misma origen; cookie de sesión httpOnly).
export class ErrorApi extends Error {
  constructor(status, mensaje, campo) {
    super(mensaje);
    this.status = status;
    this.campo = campo;
  }
}

async function solicitar(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, credentials: 'same-origin', headers: {} };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let res;
  try {
    res = await fetch(`/api${ruta}`, opciones);
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa tu internet.');
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErrorApi(res.status, datos.error || 'Ocurrió un error.', datos.campo);
  return datos;
}

export const api = {
  get: (ruta) => solicitar('GET', ruta),
  post: (ruta, cuerpo = {}) => solicitar('POST', ruta, cuerpo),
  patch: (ruta, cuerpo) => solicitar('PATCH', ruta, cuerpo),
  del: (ruta) => solicitar('DELETE', ruta),
};

export const formato = {
  numero: (n, dec = 0) =>
    n === null || n === undefined
      ? '—'
      : Number(n).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec }),
  fecha: (iso) => {
    if (!iso) return 'Por definir';
    const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  },
  fechaHora: (iso) => (iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : '—'),
};
