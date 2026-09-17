import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";
import {
  BarChart3,
  Users,
  Share2,
  Search,
  Route,
  Handshake,
  TrendingUp,
  MapPin,
  Linkedin,
  Youtube,
  Twitter,
  ArrowRight,
  CheckCircle2,
  Circle,
  Info,
} from "lucide-react";

const BENEFITS = [
  {
    icon: BarChart3,
    title: "Finanzas ordenadas",
    description: "Controla tu flujo, mejora la gestión y diseña una operación más sólida para crecer con menos fricción.",
  },
  {
    icon: Users,
    title: "Acompañamiento real",
    description: "Accede a diagnóstico, plan de desarrollo y apoyo ejecutivo para ejecutar tus objetivos concretos.",
  },
  {
    icon: Share2,
    title: "Conexión regional",
    description: "Prepárate para responder mejor a grandes compradores, oportunidades de mercado y alianzas estratégicas.",
  },
];

const STATS = [
  { value: "200", label: "cupos regionales" },
  { value: "6", label: "regiones de foco" },
  { value: "100%", label: "apoyo en desarrollo" },
];

const STEPS = [
  { icon: Search, title: "Diagnóstico", desc: "Analizamos tu empresa, tus fortalezas y los puntos que más te pueden impulsar." },
  { icon: Route, title: "Plan de desarrollo", desc: "Diseñamos una ruta con formación, herramientas y acompañamiento práctico." },
  { icon: Handshake, title: "Acompañamiento", desc: "Un ejecutivo acompaña tu proceso para resolver dudas y priorizar acciones." },
  { icon: TrendingUp, title: "Crecimiento", desc: "Fortaleces tu operación y accedes a nuevas oportunidades de mercado." },
];

const TESTIMONIOS = [
  {
    quote: "El programa nos ayudó a ordenar la gestión y a mirar oportunidades que antes no estaban tan claras.",
    author: "Gerente general",
    company: "Empresa de servicios industriales",
  },
  {
    quote: "Más que apoyo, nos dio una ruta concreta para crecer con mejor control y mayor preparación para clientes grandes.",
    author: "Dueño de Pyme",
    company: "Proveedor regional",
  },
  {
    quote: "La combinación entre diagnóstico, acompañamiento y conexión con oportunidades hace toda la diferencia.",
    author: "Coordinador de operaciones",
    company: "Proveedor logístico",
  },
];

const PROGRAMAS = [
  {
    title: "Finanzas m?s claras",
    description: "Mejora tu control financiero y crea una base m?s s?lida para tomar decisiones con confianza.",
  },
  {
    title: "Academia y formaci?n",
    description: "Aporta herramientas pr?cticas para fortalecer capacidades, procesos y liderazgo empresarial.",
  },
  {
    title: "Conexi?n con mercado",
    description: "Te acercamos a oportunidades de negocio y a empresas que buscan proveedores m?s preparados.",
  },
];

const REGIONES = ["Antofagasta", "Atacama", "Coquimbo", "Tarapacá", "Valparaíso", "Metropolitana", "Otra"];
const RUBROS = ["Transporte y logística", "Construcción", "Servicios industriales", "Alimentación", "Tecnología", "Otro"];

function PreinscripcionForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          companyName: form.get("companyName"),
          rut: form.get("rut"),
          region: form.get("region"),
          industry: form.get("industry"),
          contactName: form.get("contactName"),
          contactEmail: form.get("contactEmail"),
          contactPhone: form.get("contactPhone"),
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "No pudimos enviar tu preinscripción");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h3 className="text-xl font-bold">¡Preinscripción recibida!</h3>
        <p className="max-w-sm text-muted-foreground">
          Un ejecutivo de Proveedor Regional se pondrá en contacto contigo para continuar tu diagnóstico y acompañarte en el proceso.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="companyName">Nombre de la empresa *</Label>
        <Input id="companyName" name="companyName" required placeholder="Ej. Servicios Industriales SpA" />
      </div>
      <div>
        <Label htmlFor="rut">RUT de la empresa *</Label>
        <Input id="rut" name="rut" required placeholder="Ej. 76.123.456-7" />
      </div>
      <div>
        <Label htmlFor="industry">Rubro *</Label>
        <Select id="industry" name="industry" required defaultValue="">
          <option value="" disabled>Selecciona un rubro</option>
          {RUBROS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="region">Región *</Label>
        <Select id="region" name="region" required defaultValue="">
          <option value="" disabled>Selecciona una región</option>
          {REGIONES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="contactName">Persona de contacto *</Label>
        <Input id="contactName" name="contactName" required placeholder="Nombre y apellido" />
      </div>
      <div>
        <Label htmlFor="contactEmail">Correo electrónico *</Label>
        <Input id="contactEmail" name="contactEmail" type="email" required placeholder="ejemplo@empresa.cl" />
      </div>
      <div>
        <Label htmlFor="contactPhone">Teléfono *</Label>
        <Input id="contactPhone" name="contactPhone" required placeholder="+56 9 1234 5678" />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="sm:col-span-2" disabled={loading}>
        {loading ? "Enviando..." : (
          <>
            Enviar preinscripción <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return <img src={logoProveedorRegional} alt="Proveedor Regional" className={`h-16 w-16 rounded-lg ${light ? "shadow-md" : ""}`} />;
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <a href="#inicio" className="text-primary">Inicio</a>
            <a href="#desarrollo" className="hover:text-primary">Desarrollo</a>
            <a href="#como-funciona" className="hover:text-primary">Cómo funciona</a>
            <a href="#empresas" className="hover:text-primary">Empresas</a>
            <a href="#preinscripcion" className="hover:text-primary">Contacto</a>
          </nav>
          <a href="#preinscripcion">
            <Button size="sm">
              Quiero ser parte <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </header>

      <section id="inicio" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">Centro de Desarrollo de Proveedores Regionales</p>
              <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
                Tu empresa, lista para crecer con más oportunidades y más capacidad.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Proveedor Regional ayuda a proveedores regionales a fortalecer su gestión, acceder a financiamiento y prepararse para competir mejor con grandes empresas y mercados en expansión.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#preinscripcion">
                  <Button size="lg">
                    Quiero ser parte <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/registro?tipo=empresa">
                  <Button size="lg" variant="outline">Soy empresa patrocinadora</Button>
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {STATS.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                    <div className="text-2xl font-extrabold text-primary">{stat.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl bg-brand-gradient p-8 text-white shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Tu plan de crecimiento</p>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">Activa</span>
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white/30 text-2xl font-bold">
                    75%
                  </div>
                  <div>
                    <p className="font-semibold">Ruta de desarrollo</p>
                    <ul className="mt-2 space-y-2 text-sm text-white/90">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Diagnóstico completado</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Plan en ejecución</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Acompañamiento activo</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-sm text-white/80">Qué incluye</p>
                  <div className="mt-3 grid gap-2 text-sm text-white/95">
                    <div className="flex items-center gap-2"><Circle className="h-4 w-4 fill-current text-white" /> Financiamiento y gestión</div>
                    <div className="flex items-center gap-2"><Circle className="h-4 w-4 fill-current text-white" /> Formación y capacidades</div>
                    <div className="flex items-center gap-2"><Circle className="h-4 w-4 fill-current text-white" /> Conexión con compradores</div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" /> Antofagasta, Chile
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="desarrollo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">¿Qué te aporta Proveedor Regional?</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Más herramientas para operar, crecer y competir.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="h-full border-0 bg-card shadow-sm">
              <CardHeader className="items-start">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet/10">
                  <b.icon className="h-7 w-7 text-violet" />
                </div>
                <CardTitle className="text-xl">{b.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-7">{b.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">Programas clave</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Todo lo que necesitas para operar mejor y crecer con confianza.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PROGRAMAS.map((programa) => (
              <div key={programa.title} className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-full bg-violet/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet">
                  Programa
                </div>
                <h3 className="text-xl font-bold text-foreground">{programa.title}</h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">{programa.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-muted/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Una ruta simple para avanzar</h2>
          <div className="mt-10 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 lg:flex-col">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <s.icon className="h-6 w-6 text-violet" />
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">Resultados que se sienten</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Una plataforma pensada para fortalecer proveedores regionales.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIOS.map((item) => (
              <Card key={item.author} className="h-full border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="mb-4 flex gap-1 text-violet">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span key={index}>★</span>
                    ))}
                  </div>
                  <p className="text-base leading-7 text-foreground">“{item.quote}”</p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="font-semibold text-primary">{item.author}</p>
                    <p className="text-sm text-muted-foreground">{item.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="empresas" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Sé parte de Proveedor Regional</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet/10">
                <Users className="h-6 w-6 text-violet" />
              </div>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>Una membresía para impulsar la modernización y el crecimiento de tu empresa.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="#preinscripcion">
                <Button>Conocer el programa <ArrowRight className="h-4 w-4" /></Button>
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet/10">
                <Handshake className="h-6 w-6 text-violet" />
              </div>
              <CardTitle>Empresas patrocinadoras</CardTitle>
              <CardDescription>Programas para fortalecer las capacidades de sus proveedores regionales.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/registro?tipo=empresa">
                <Button variant="outline">Conversemos <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="preinscripcion" className="bg-muted/50 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Formulario de preinscripción</CardTitle>
              <CardDescription>Completa tus datos y conversa con nuestro equipo para comenzar tu diagnóstico.</CardDescription>
            </CardHeader>
            <CardContent>
              <PreinscripcionForm />
            </CardContent>
          </Card>
          <div className="flex flex-col justify-end rounded-2xl bg-brand-gradient p-8 text-white">
            <h3 className="text-2xl font-bold leading-tight">
              Más desarrollo. Más proveedores. Más región.
            </h3>
            <p className="mt-3 text-sm text-white/80">
              Te ayudamos a estructurar mejor tu negocio, fortalecer tu operación y preparar tu empresa para nuevas oportunidades.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Proveedor Regional es un centro de desarrollo para proveedores regionales. No garantiza adjudicaciones ni reemplaza procesos de compra de terceros. La tarjeta de débito (vía Pomelo) y la protección paramétrica son <strong>integraciones en desarrollo, hoy simuladas</strong> — sin movimientos de dinero reales. El detalle de tarjeta, protección paramétrica y Academia Proveedor Regional está disponible en el panel de proveedor, tras iniciar sesión.
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-primary py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <Logo light />
            <nav className="flex flex-wrap gap-5 text-sm text-white/80">
              <a href="#inicio" className="hover:text-white">Inicio</a>
              <a href="#desarrollo" className="hover:text-white">Desarrollo</a>
              <a href="#como-funciona" className="hover:text-white">Cómo funciona</a>
              <a href="#empresas" className="hover:text-white">Empresas</a>
              <a href="#preinscripcion" className="hover:text-white">Contacto</a>
            </nav>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-white/80">
                <MapPin className="h-4 w-4" /> Antofagasta, Chile
              </div>
              <div className="flex gap-3">
                <Linkedin className="h-4 w-4 text-white/70 hover:text-white" />
                <Youtube className="h-4 w-4 text-white/70 hover:text-white" />
                <Twitter className="h-4 w-4 text-white/70 hover:text-white" />
              </div>
            </div>
            <p className="text-right text-sm font-medium text-white/80">
              Más desarrollo.<br />Más proveedores. Más región.
            </p>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/20 pt-6 text-xs text-white/60 sm:flex-row">
            <p>© 2026 Proveedor Regional. Todos los derechos reservados.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Términos de uso</a>
              <a href="#" className="hover:text-white">Política de privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
