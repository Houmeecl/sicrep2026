import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { SicrepMark } from "@/components/SicrepMark";
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
    title: "Desarrollo",
    description: "Ordena tus finanzas, mejora tu gestión y fortalece las capacidades de tu empresa.",
  },
  {
    icon: Users,
    title: "Acompañamiento",
    description: "Avanza con un diagnóstico, un plan de desarrollo y asesoría durante el proceso.",
  },
  {
    icon: Share2,
    title: "Conexión",
    description: "Prepárate para responder a las necesidades de grandes compradores y mercados regionales.",
  },
];

const STEPS = [
  { icon: Search, title: "Diagnóstico", desc: "Analizamos tus necesidades y potencial de crecimiento." },
  { icon: Route, title: "Plan de desarrollo", desc: "Diseñamos una ruta con formación, herramientas y acompañamiento." },
  { icon: Handshake, title: "Acompañamiento", desc: "Un ejecutivo te apoya durante todo el proceso." },
  { icon: TrendingUp, title: "Crecimiento", desc: "Fortaleces tu empresa y accedes a más oportunidades." },
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
          Un ejecutivo de SICREP se pondrá en contacto contigo para continuar tu diagnóstico.
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
  return (
    <div className="flex items-center gap-2">
      <SicrepMark className="h-8 w-8" />
      <div className="leading-none">
        <div className={`text-xl font-extrabold ${light ? "text-white" : ""}`}>
          <span className={light ? "text-white" : "text-primary"}>sic</span>
          <span className="bg-sicrep-gradient bg-clip-text text-transparent">rep</span>
        </div>
        <div className={`text-[9px] font-semibold uppercase tracking-wide ${light ? "text-white/70" : "text-muted-foreground"}`}>
          Centro Desarrollo<br />Proveedor Regional
        </div>
      </div>
    </div>
  );
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
        <div className="absolute inset-0 bg-sicrep-gradient-soft" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet">Centro de Desarrollo de Proveedores Regionales</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              Modernizamos tu{" "}
              <span className="bg-sicrep-gradient bg-clip-text text-transparent">empresa para crecer</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Finanzas sostenibles, formación y acompañamiento para fortalecer tu gestión y prepararte para
              nuevas oportunidades.
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
          </div>

          <div className="relative">
            <div className="rounded-2xl bg-sicrep-gradient p-8 text-white shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Progreso de desarrollo</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white/30 text-2xl font-bold">
                  75%
                </div>
                <div>
                  <p className="font-semibold">Plan de desarrollo</p>
                  <ul className="mt-1 space-y-1 text-sm text-white/90">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Diagnóstico completado</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Plan en ejecución</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Acompañamiento activo</li>
                    <li className="flex items-center gap-2 text-white/60"><Circle className="h-4 w-4" /> Nuevas oportunidades</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" /> Antofagasta, Chile
            </div>
          </div>
        </div>
      </section>

      <section id="desarrollo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="text-center">
              <CardHeader className="items-center">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-violet/10">
                  <b.icon className="h-7 w-7 text-violet" />
                </div>
                <CardTitle className="text-base">{b.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{b.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-muted/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Una ruta para avanzar</h2>
          <div className="mt-10 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex items-start gap-3 lg:flex-col">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sicrep-gradient font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <s.icon className="h-6 w-6 text-violet" />
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <span className="mt-2 hidden text-muted-foreground/40 lg:inline-flex">→</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="empresas" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Sé parte de SICREP</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-violet/10">
                <Users className="h-6 w-6 text-violet" />
              </div>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>Una membresía para impulsar la modernización de tu empresa.</CardDescription>
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
              <CardDescription>Completa tus datos y sé parte de SICREP.</CardDescription>
            </CardHeader>
            <CardContent>
              <PreinscripcionForm />
            </CardContent>
          </Card>
          <div className="flex flex-col justify-end rounded-2xl bg-sicrep-gradient p-8 text-white">
            <h3 className="text-2xl font-bold leading-tight">
              Más desarrollo. Más proveedores. Más región.
            </h3>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            SICREP es un centro de desarrollo para proveedores regionales. No garantiza adjudicaciones ni
            reemplaza procesos de compra de terceros. La tarjeta de débito (vía Pomelo) y la protección
            paramétrica son <strong>integraciones en desarrollo, hoy simuladas</strong> — sin movimientos de
            dinero reales. El detalle de tarjeta, protección paramétrica y Academia Proveedor Regional está
            disponible en el panel de proveedor, tras iniciar sesión.
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
            <p>© 2026 SICREP. Todos los derechos reservados.</p>
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
