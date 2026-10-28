import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo.jsx';

// Texto base: debe ser revisado por un abogado antes de publicarse.
export default function Privacidad() {
  return (
    <div className="min-h-screen bg-arena-50">
      <header className="border-b border-navy-900/8 bg-white">
        <div className="contenedor py-4">
          <Link to="/"><Logo /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-4xl font-extrabold">Política de privacidad</h1>
        <p className="mt-2 text-tinta-600">Versión 2026-10 · Registro de asistentes a eventos</p>
        <div className="mt-8 flex flex-col gap-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold">Responsable</h2>
            <p>Fundación Entretodos, domiciliada en Baquedano 239, oficina 316, Antofagasta. Contacto: [correo].</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Qué datos tratamos y para qué</h2>
            <p>
              Nombre, correo, organización, forma de participación, ciudad de origen, medio de traslado y noches de
              alojamiento. Los usamos para registrar tu asistencia y calcular, de forma agregada, la huella de carbono del
              evento. Si lo autorizas, también para enviarte información de Proveedor Regional.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Base de licitud</h2>
            <p>Tu consentimiento, que puedes revocar en cualquier momento sin efecto retroactivo.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Con quién se comparten</h2>
            <p>
              Los informes del evento solo muestran cifras agregadas. Tus datos personales no se venden ni se ceden a
              terceros. Los proveedores de alojamiento del sistema actúan por encargo de la fundación.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Plazo de conservación</h2>
            <p>[Define el plazo, por ejemplo: 24 meses desde el evento.]</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">Tus derechos</h2>
            <p>
              Puedes solicitar acceso, rectificación, supresión, oposición, portabilidad y bloqueo de tus datos escribiendo a
              [correo]. Responderemos dentro de los plazos que establece la ley.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
