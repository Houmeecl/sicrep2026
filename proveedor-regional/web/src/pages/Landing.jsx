import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChartColumn,
  Check,
  ChevronDown,
  CreditCard,
  Leaf,
  Menu,
  QrCode,
  Search,
  Shield,
  X,
} from 'lucide-react';
import { Logo } from '../components/Logo.jsx';

const NAV = [
  ['Membresía', '#membresia'],
  ['Servicios', '#servicios'],
  ['Pasaporte', '#pasaporte'],
  ['Territorio', '#territorio'],
  ['Nosotros', '#nosotros'],
];

const SERVICIOS = [
  { icono: Search, titulo: 'Diagnóstico', texto: 'Sales con un plan de trabajo y tus brechas priorizadas: gestión, finanzas, cumplimiento y seguridad.' },
  { icono: BookOpen, titulo: 'Ciclos de 13 semanas', texto: 'Formación con el método CORA —Conocer, Organizar, Realizar, Aprender— y agenda física del programa.' },
  { icono: ChartColumn, titulo: 'Finanzas sostenibles', texto: 'Orden financiero, preparación para financiamiento y medición de huella para responder a tus clientes.' },
  { icono: Shield, titulo: 'Protección', texto: '[Describe el alcance del servicio de protección y la entidad que lo presta.]' },
  { icono: CreditCard, titulo: 'Tarjeta empresarial', texto: '[Describe los beneficios de la tarjeta empresarial para socios.]' },
  { icono: BadgeCheck, titulo: 'Pasaporte y sello', texto: 'Tu documentación revisada en un solo lugar, con adhesivo y sello digital verificables.' },
];

const BLOQUES_PASAPORTE = [
  ['Identidad y arraigo regional', 'exito', 'Verificado'],
  ['Situación tributaria (SII)', 'exito', 'Verificado'],
  ['Laboral y previsional (F30, F30-1)', 'alerta', 'Vence en 7 días'],
  ['Mutualidad y seguridad', 'exito', 'Verificado'],
  ['SICEP', 'exito', 'Vigente'],
  ['Certificaciones y ESG', 'neutro', 'Declarado'],
];

const PROVINCIAS = [
  ['Provincia de Antofagasta', ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal']],
  ['Provincia de El Loa', ['Calama', 'Ollagüe', 'San Pedro de Atacama']],
  ['Provincia de Tocopilla', ['Tocopilla', 'María Elena']],
];

const PREGUNTAS = [
  ['¿El sello sirve para entrar a faena?', 'No. El acceso de trabajadores lo gestiona cada minera con su empresa acreditadora. El sello identifica a tu empresa y el pasaporte te ayuda a tener tus documentos al día para esa acreditación.'],
  ['¿Por qué debo estar inscrito en SICEP?', 'SICEP es el registro de calificación de proveedores que usan las mineras. No lo reemplazamos: verificamos tu inscripción y te acompañamos para mantenerla vigente.'],
  ['¿Qué pasa con mis $20.000 si no soy aprobado?', '[Define la política: devolución total o abono a la primera mensualidad.]'],
  ['¿Qué datos de mi empresa son públicos?', 'Solo los que autorizas: nombre, comuna, rubros y el estado de tu pasaporte. Tus documentos y los datos de tus trabajadores nunca se publican.'],
  ['¿Cómo termino mi membresía?', 'Desde tu panel de socio, con un botón y sin trámites adicionales. Recibirás el comprobante por correo.'],
];

function Encabezado() {
  const [abierto, setAbierto] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-navy-900/8 bg-white/85 backdrop-blur-md">
      <div className="contenedor flex h-18 items-center justify-between gap-4">
        <a href="#inicio" aria-label="Proveedor Regional, inicio">
          <Logo />
        </a>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map(([t, h]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-2 font-semibold text-navy-900 hover:bg-navy-50">
              {t}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/ingresar" className="boton-fantasma">
            Ingresar
          </Link>
          <a href="#membresia" className="boton-accion">
            Preinscríbete · $20.000
          </a>
        </div>
        <button
          type="button"
          className="boton-fantasma px-3 lg:hidden"
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {abierto && (
        <nav id="menu-movil" aria-label="Principal móvil" className="border-t border-navy-900/8 bg-white lg:hidden">
          <div className="contenedor flex flex-col gap-1 py-3">
            {NAV.map(([t, h]) => (
              <a key={h} href={h} onClick={() => setAbierto(false)} className="rounded-lg px-3 py-3 font-semibold hover:bg-navy-50">
                {t}
              </a>
            ))}
            <Link to="/ingresar" className="boton-secundario mt-2">
              Ingresar
            </Link>
            <a href="#membresia" onClick={() => setAbierto(false)} className="boton-accion">
              Preinscríbete · $20.000
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function Sello() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px] rounded-full border-[10px] border-cobre-400 bg-arena-100 p-8 text-center shadow-2xl shadow-black/30">
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <span className="font-display text-[13px] font-extrabold uppercase tracking-[0.16em] text-cobre-700">
          Proveedor Regional
        </span>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <QrCode className="size-24 text-navy-900" strokeWidth={1.4} aria-hidden="true" />
        </div>
        <span className="font-display text-2xl font-extrabold text-navy-900">Socio 2027</span>
        <span className="text-[13px] text-tinta-600">Folio PR-[000000] · Escanea para verificar</span>
      </div>
    </div>
  );
}

function Montanas() {
  return (
    <svg className="absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 160 L0 110 L180 60 L340 105 L520 40 L700 100 L880 55 L1060 95 L1240 45 L1440 90 L1440 160 Z" fill="#17395A" />
      <path d="M0 160 L0 130 L240 95 L460 130 L700 90 L960 128 L1200 100 L1440 125 L1440 160 Z" fill="#0B2236" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div id="inicio">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Saltar al contenido
      </a>
      <Encabezado />

      <main id="contenido">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy-900 text-white">
          <div className="contenedor relative z-10 grid items-center gap-14 pb-36 pt-16 md:pt-24 lg:grid-cols-[1.25fr_1fr]">
            <div className="flex flex-col gap-6">
              <p className="sobretitulo text-cobre-200">Institución de desarrollo de proveedores</p>
              <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-[3.6rem]">
                Tu empresa, preparada para crecer en su territorio.
              </h1>
              <p className="max-w-xl text-xl text-navy-100">
                Diagnóstico, formación, finanzas sostenibles y un pasaporte documental verificable para pymes de las 9
                comunas de la Región de Antofagasta.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#membresia" className="boton-accion min-h-13 px-6 text-lg">
                  Preinscribe tu empresa · $20.000
                </a>
                <a href="#verificar" className="boton min-h-13 border-2 border-white/80 px-6 text-lg text-white hover:bg-white/10">
                  Verificar un sello
                </a>
              </div>
            </div>
            <Sello />
          </div>
          <Montanas />
          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="contenedor flex flex-wrap gap-x-10 gap-y-2 py-5 text-base font-semibold text-navy-100">
              <span><strong className="font-display text-white">183</strong> pymes seleccionadas</span>
              <span><strong className="font-display text-white">9</strong> comunas</span>
              <span>Operado por <strong className="text-white">Fundación Entretodos</strong>, sin fines de lucro</span>
            </div>
          </div>
        </section>

        {/* Propuesta */}
        <section className="contenedor py-20 md:py-24">
          <h2 className="max-w-3xl text-3xl font-extrabold sm:text-4xl">
            Del proveedor local al proveedor estratégico.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ['Te preparamos', 'Diagnóstico de tu empresa y ciclos de formación de 13 semanas.', 'border-navy-700'],
              ['Te verificamos', 'Tu documentación en un pasaporte digital, con un sello que cualquier comprador puede comprobar.', 'border-cobre-700'],
              ['Te conectamos', 'Directorio de socios y vitrina ante compradores mineros, contratistas y fondos regionales.', 'border-naranjo-500'],
            ].map(([t, x, b]) => (
              <div key={t} className={`border-t-4 pt-5 ${b}`}>
                <h3 className="text-2xl font-bold">{t}</h3>
                <p className="mt-2 text-tinta-600">{x}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="bg-arena-100 py-20 md:py-24">
          <div className="contenedor">
            <p className="sobretitulo">Servicios incluidos</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Todo lo que incluye la membresía.</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICIOS.map(({ icono: Icono, titulo, texto }) => (
                <div key={titulo} className="tarjeta p-7 transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="inline-flex size-12 items-center justify-center rounded-xl bg-navy-50">
                    <Icono className="size-6 text-navy-700" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{titulo}</h3>
                  <p className="mt-2 text-tinta-600">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pasaporte */}
        <section id="pasaporte" className="contenedor grid items-start gap-14 py-20 md:py-24 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <p className="sobretitulo">Pasaporte del Proveedor Regional</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Toda la documentación de tu empresa, en un solo lugar y al día.</h2>
            <p className="text-tinta-600">
              Subes tus documentos una vez. La fundación los revisa, te avisa antes de que venzan y muestra su estado a
              quien tú autorices. Llegas a cada acreditación con la carpeta lista.
            </p>
            <ul className="flex flex-col gap-4">
              {[
                ['bg-navy-700', 'Público', 'al escanear tu sello se ven solo estados, nunca tus archivos.'],
                ['bg-cobre-700', 'Compradores autorizados', 'mineras, contratistas y acreditadoras que tú habilitas ven los documentos, con registro de cada acceso.'],
                ['bg-naranjo-500', 'Privado', 'los originales quedan cifrados y los datos de tus trabajadores nunca son públicos.'],
              ].map(([c, t, x]) => (
                <li key={t} className="flex gap-3">
                  <span className={`mt-2.5 size-2.5 shrink-0 rounded-full ${c}`} />
                  <span><strong>{t}:</strong> {x}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-navy-900/10 pt-4 text-[15px] text-tinta-600">
              No reemplaza la acreditación de trabajadores que exige cada faena ni la calificación SICEP: te ayuda a cumplirlas a tiempo.
            </p>
          </div>
          <div className="rounded-3xl bg-arena-100 p-5 sm:p-6">
            <div className="tarjeta flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="sobretitulo text-[12px]">Ejemplo de ficha pública</p>
                <p className="font-display text-xl font-extrabold">[Razón social] SpA</p>
                <p className="text-[15px] text-tinta-600">Calama · Mantención industrial</p>
              </div>
              <span className="rounded-full bg-exito-100 px-3 py-1.5 text-[15px] font-bold text-exito-700">✓ Socio vigente</span>
            </div>
            <ul className="tarjeta mt-3 divide-y divide-navy-900/8 px-5">
              {BLOQUES_PASAPORTE.map(([t, tono, e]) => (
                <li key={t} className="flex justify-between gap-3 py-3.5">
                  <span>{t}</span>
                  <span className={`font-bold ${tono === 'exito' ? 'text-exito-700' : tono === 'alerta' ? 'text-alerta-700' : 'text-tinta-600'}`}>
                    {tono === 'exito' ? '✓ ' : tono === 'alerta' ? '● ' : ''}{e}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Sello y verificación */}
        <section id="verificar" className="bg-navy-900 py-20 text-white md:py-24">
          <div className="contenedor">
            <p className="sobretitulo text-cobre-200">Sello Proveedor Regional</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Un sello que se puede comprobar.</h2>
            <p className="mt-3 max-w-2xl text-navy-100">
              El sello es de la empresa, no de sus trabajadores. Un mismo folio en dos formatos: si la empresa deja de
              estar vigente, el sello lo muestra al instante.
            </p>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/15 p-7">
                <h3 className="text-xl font-bold">Adhesivo</h3>
                <p className="mt-2 text-navy-100">Para oficina, vitrina, vehículos y equipos. Color distinto cada año, folio impreso y vinilo de seguridad.</p>
              </div>
              <div className="rounded-2xl border border-white/15 p-7">
                <h3 className="text-xl font-bold">Sello digital</h3>
                <p className="mt-2 text-navy-100">Para cotizaciones, facturas, firma de correo y licitaciones. Firmado digitalmente: nadie puede fabricar uno válido.</p>
              </div>
              <form className="rounded-2xl bg-white p-7 text-navy-900" onSubmit={(e) => e.preventDefault()} aria-label="Verificar un sello">
                <h3 className="text-xl font-bold">Verifica una empresa</h3>
                <label htmlFor="folio" className="etiqueta mt-4">Folio o RUT de la empresa</label>
                <input id="folio" className="campo" placeholder="PR-000000 o 76.123.456-7" />
                <button type="submit" className="boton-primario mt-3 w-full" disabled title="Disponible con el módulo de pasaporte">
                  Verificar
                </button>
                <p className="mt-2 text-sm text-tinta-600">Disponible cuando se active el pasaporte de socios.</p>
              </form>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="contenedor py-20 md:py-24">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Cómo te haces socio.</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Preinscríbete', 'Datos de tu empresa y pago único de $20.000 vía Flow.'],
              ['Validamos tu empresa', 'RUT, actividades, inscripción SICEP y revisión manual. Plazo: [X] días hábiles.'],
              ['Recibes pasaporte y sello', 'Adhesivo, sello digital y tu ficha en el directorio, si lo autorizas.'],
              ['Comienza tu ciclo', 'Activas la membresía y partes tu primer ciclo de 13 semanas.'],
            ].map(([t, x], i) => (
              <li key={t} className="flex flex-col gap-3">
                <span className={`flex size-11 items-center justify-center rounded-full font-display font-extrabold ${i === 3 ? 'bg-naranjo-500 text-navy-950' : 'bg-navy-900 text-white'}`}>
                  {i + 1}
                </span>
                <h3 className="text-xl font-bold">{t}</h3>
                <p className="text-tinta-600">{x}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Membresía */}
        <section id="membresia" className="bg-arena-100 py-20 md:py-24">
          <div className="contenedor grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="sobretitulo">Membresía</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Una sola membresía. Sin planes ni letra chica.</h2>
              <p className="mt-4 text-tinta-600">
                El mismo precio para todas las empresas socias, con todos los servicios incluidos. Puedes terminar tu
                membresía en línea, desde tu panel, cuando quieras.
              </p>
            </div>
            <div className="rounded-3xl border-2 border-cobre-400 bg-white p-8 shadow-sm sm:p-10">
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-5xl font-extrabold">$120.000</span>
                <span className="text-lg text-tinta-600">al mes por empresa [+ IVA / IVA incluido]</span>
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  'Diagnóstico y ciclos de formación de 13 semanas',
                  'Pasaporte documental con alertas de vencimiento',
                  'Adhesivo anual y sello digital verificable',
                  'Perfil en el directorio de socios',
                  'Finanzas sostenibles, protección y tarjeta empresarial',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-navy-700" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl bg-arena-100 p-4 text-[15px]">
                <strong>Preinscripción: pago único de $20.000.</strong> [Se abona a tu primera mensualidad / se devuelve si tu empresa no es aprobada.]
              </div>
              <a href="mailto:[correo]?subject=Preinscripci%C3%B3n%20Proveedor%20Regional" className="boton-accion mt-6 w-full min-h-13 text-lg">
                Preinscribe tu empresa <ArrowRight className="size-5" aria-hidden="true" />
              </a>
              <p className="mt-3 text-sm text-tinta-600">
                Cobro mensual automático vía Flow. Antes de pagar te informamos el derecho a retracto y cómo terminar la membresía.
              </p>
            </div>
          </div>
        </section>

        {/* Territorio */}
        <section id="territorio" className="contenedor py-20 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="sobretitulo">Territorio</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Presentes en las 9 comunas de la región.</h2>
            </div>
            <p className="font-display text-xl font-extrabold">
              <span className="text-5xl text-navy-700">183</span> pymes seleccionadas
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PROVINCIAS.map(([p, comunas]) => (
              <div key={p} className="tarjeta p-6">
                <h3 className="text-lg font-bold text-navy-700">{p}</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {comunas.map((c) => (
                    <li key={c} className="flex justify-between">
                      <span>{c}</span>
                      <span className="text-tinta-600">[N] pymes</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Eventos sostenibles */}
        <section className="bg-arena-100 py-20 md:py-24">
          <div className="contenedor grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="sobretitulo">Eventos sostenibles</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Medimos la huella de nuestros encuentros.</h2>
              <p className="mt-4 text-tinta-600">
                En cada encuentro del programa registramos la asistencia por QR, calculamos la huella de carbono con la
                metodología KONTAX Events y publicamos un informe con los criterios de Evento Verde.
              </p>
            </div>
            <div className="tarjeta flex items-start gap-4 p-6">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-exito-100">
                <Leaf className="size-6 text-exito-700" aria-hidden="true" />
              </span>
              <p>
                <strong>Transporte, energía, residuos, catering, agua e infraestructura</strong>, con emisiones por
                asistente y metas de reciclaje y energía renovable.
              </p>
            </div>
          </div>
        </section>

        {/* Nosotros */}
        <section id="nosotros" className="contenedor grid gap-12 py-20 md:py-24 lg:grid-cols-2">
          <div>
            <p className="sobretitulo">Quiénes somos</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Una iniciativa de Fundación Entretodos.</h2>
            <p className="mt-4 text-tinta-600">
              Proveedor Regional es operado por Fundación Entretodos, persona jurídica sin fines de lucro con domicilio en
              Antofagasta. Publicamos estatutos, directorio, memoria, balance y fuentes de financiamiento.
            </p>
          </div>
          <div className="tarjeta p-7">
            <h3 className="text-xl font-bold">Cómo nos financiamos</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Membresías de empresas proveedoras</li>
              <li>Servicios y formación</li>
              <li>Aportes de empresas mineras</li>
              <li>Fondos públicos regionales</li>
            </ol>
            <p className="mt-3 text-sm text-tinta-600">Porcentaje de cada fuente: [se publica al cierre del primer ejercicio].</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-arena-100 py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Preguntas frecuentes</h2>
            <div className="mt-8 flex flex-col gap-3">
              {PREGUNTAS.map(([p, r]) => (
                <details key={p} className="group tarjeta px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">
                    {p}
                    <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 text-tinta-600">{r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-navy-700 text-white">
          <div className="contenedor flex flex-wrap items-center justify-between gap-6 py-16">
            <h2 className="max-w-xl text-3xl font-extrabold">Haz que tu empresa se vea preparada, verificada y regional.</h2>
            <a href="#membresia" className="boton-accion min-h-13 px-6 text-lg">
              Preinscribe tu empresa · $20.000
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-navy-950 text-[15px] text-navy-100">
        <div className="contenedor grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <Logo claro subtitulo={false} />
            <span className="mt-2">Una iniciativa de Fundación Entretodos</span>
            <span>Baquedano 239, of. 316, Antofagasta</span>
            <span>[correo] · [WhatsApp] · [horario]</span>
          </div>
          <nav aria-label="Pie de página" className="flex flex-col gap-2">
            <span className="font-bold text-white">Proveedor Regional</span>
            <a href="#membresia" className="hover:text-white">Membresía</a>
            <a href="#verificar" className="hover:text-white">Verificar sello</a>
            <Link to="/ingresar" className="hover:text-white">Ingreso</Link>
          </nav>
          <nav aria-label="Legal" className="flex flex-col gap-2">
            <span className="font-bold text-white">Legal</span>
            <Link to="/privacidad" className="hover:text-white">Política de privacidad</Link>
            <span>Términos de membresía [pendiente]</span>
            <span>Uso del sello [pendiente]</span>
          </nav>
        </div>
        <div className="contenedor border-t border-white/10 py-6 text-sm">
          © {new Date().getFullYear()} Fundación Entretodos. Proveedor Regional no es un organismo certificador ni
          reemplaza la calificación SICEP ni la acreditación de faena.
        </div>
      </footer>
    </div>
  );
}
