import { BadgeCheck } from 'lucide-react';
import { useSesion } from '../../lib/sesion.jsx';

export default function InicioSocio() {
  const { usuario } = useSesion();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="sobretitulo">Socio</p>
        <h1 className="text-3xl font-extrabold">Hola, {usuario.nombre.split(' ')[0]}</h1>
      </div>
      <div className="tarjeta flex items-start gap-4 p-7">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-cobre-50">
          <BadgeCheck className="size-6 text-cobre-700" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-bold">Tu pasaporte de proveedor está en preparación</h2>
          <p className="mt-2 text-tinta-600">
            Pronto podrás subir tu documentación, recibir alertas de vencimiento y descargar tu sello digital desde este
            panel. Te avisaremos por correo cuando esté disponible.
          </p>
        </div>
      </div>
    </div>
  );
}
