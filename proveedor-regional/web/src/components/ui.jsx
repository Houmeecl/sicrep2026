import { CircleAlert, LoaderCircle } from 'lucide-react';

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-tinta-600" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function Aviso({ tipo = 'error', children }) {
  const estilos = {
    error: 'border-red-200 bg-red-50 text-red-800',
    alerta: 'border-alerta-100 bg-alerta-100 text-alerta-700',
    exito: 'border-exito-100 bg-exito-100 text-exito-700',
    info: 'border-navy-100 bg-navy-50 text-navy-900',
  };
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-xl border px-4 py-3 text-[15px] ${estilos[tipo]}`}>
      {tipo === 'error' && <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}

export function Insignia({ tono = 'neutro', children }) {
  const estilos = {
    neutro: 'bg-navy-50 text-navy-900',
    exito: 'bg-exito-100 text-exito-700',
    alerta: 'bg-alerta-100 text-alerta-700',
    cobre: 'bg-cobre-50 text-cobre-700',
    oscuro: 'bg-navy-800 text-white',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold ${estilos[tono]}`}>
      {children}
    </span>
  );
}

export function Campo({ id, etiqueta, ayuda, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 text-sm text-tinta-600">{ayuda}</p>}
      {error && <p className="mt-1 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
