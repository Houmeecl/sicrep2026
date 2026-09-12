import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { formatCLP } from "@/lib/utils";
import {
  Search,
  Route,
  GraduationCap,
  Users,
  ShieldCheck,
  CreditCard,
  Share2,
  Mountain,
  ArrowRight,
  Info,
  CheckCircle2,
  Award,
  Plane,
} from "lucide-react";

const OFERTA = [
  { icon: Search, title: "Diagnóstico inicial", desc: "Conocemos tu punto de partida." },
  { icon: Route, title: "Ruta de desarrollo", desc: "Un plan concreto para crecer." },
  { icon: GraduationCap, title: "Academia y talleres", desc: "Nuevas capacidades para tu empresa." },
  { icon: Users, title: "Acompañamiento", desc: "Un ejecutivo te apoya en cada etapa." },
  { icon: ShieldCheck, title: "Protección paramétrica", desc: "Mayor resiliencia ante imprevistos." },
  { icon: CreditCard, title: "Tarjeta Proveedor Regional", desc: "Facilita tu gestión financiera." },
  { icon: Share2, title: "Conexión con oportunidades", desc: "Vinculación con la industria y la región." },
];

interface ComunaDisponibilidad {
  id: number;
  nombre: string;
  poblacion: number;
  cupos: number;
  ocupados: number;
  disponibles: number;
}

export default function Convocatoria() {
  const [comunas, setComunas] = useState<ComunaDisponibilidad[]>([]);
  const [flowHabilitado, setFlowHabilitado] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; redirectUrl: string | null } | null>(null);

  function reload() {
    api<{ comunas: ComunaDisponibilidad[]; flowHabilitado: boolean }>("/api/convocatoria/comunas")
      .then((r) => {
        setComunas(r.comunas);
        setFlowHabilitado(r.flowHabilitado);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await api<{ inscripcion: { paymentStatus: string }; redirectUrl: string | null }>(
        "/api/convocatoria/inscripciones",
        {
          method: "POST",
          body: JSON.stringify({
            comunaId: form.get("comunaId"),
            companyName: form.get("companyName"),
            rut: form.get("rut"),
            contactName: form.get("contactName"),
            contactEmail: form.get("contactEmail"),
            contactPhone: form.get("contactPhone"),
          }),
        }
      );
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
        return;
      }
      setResult({ status: res.inscripcion.paymentStatus, redirectUrl: null });
      reload();
    } catch (err: any) {
      setError(err.message ?? "No pudimos registrar tu inscripción");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-extrabold">
            <Mountain className="h-6 w-6 text-primary" />
            <span><span className="text-primary">sic</span><span className="text-accent">rep</span></span>
          </Link>
          <a href="#inscripcion">
            <Button size="sm">
              Quiero ser parte <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-sicrep-gradient-soft" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-violet">Convocatoria regional 2026</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
            <span className="bg-sicrep-gradient bg-clip-text text-transparent">¿Quieres ser parte?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Impulsamos proveedores con formación, acompañamiento y herramientas para crecer en la región.
            Las 200 empresas de esta convocatoria serán <strong>socias fundadoras</strong> de SICREP, y 50 de
            ellas serán impulsadas a un viaje de negocios a China.
          </p>
          <a href="#inscripcion">
            <Button size="lg" className="mt-8">
              Inscribirme ahora <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">¿Qué incluye tu inscripción?</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OFERTA.map((o) => (
            <Card key={o.title}>
              <CardHeader className="items-center text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-violet/10">
                  <o.icon className="h-6 w-6 text-violet" />
                </div>
                <CardTitle className="text-base">{o.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription>{o.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            La tarjeta y la protección paramétrica se implementan hoy en modo simulado (interfaz de integración
            preparada, sin movimientos de dinero reales asociados a esos beneficios). El único cobro real de esta
            página es la inscripción a la convocatoria.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Socios fundadores y viaje de negocios a China</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-violet/10">
                <Award className="h-6 w-6 text-violet" />
              </div>
              <CardTitle className="text-base">Socio fundador</CardTitle>
              <CardDescription>Las 200 empresas de esta convocatoria</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                El estatus de socio fundador se confirma después de tu inscripción y pago, sujeto a que SICREP
                verifique que tu empresa <strong>no tenga problemas tributarios ni laborales</strong> vigentes.
                No es automático ni inmediato.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-violet/10">
                <Plane className="h-6 w-6 text-violet" />
              </div>
              <CardTitle className="text-base">Viaje de negocios a China</CardTitle>
              <CardDescription>50 cupos, por sorteo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Entre las empresas inscritas con pago confirmado se sortearán <strong>50 cupos</strong> para un
                viaje de negocios a China. El sorteo es al azar, sin criterios adicionales, y se realiza una vez
                cerrada la convocatoria.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Cupos por comuna</h2>
          <p className="mt-2 text-muted-foreground">
            200 cupos en total, repartidos con un mínimo garantizado por comuna y el resto proporcional a su
            población.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {comunas.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle className="text-base">{c.nombre}</CardTitle>
                  <CardDescription>{c.disponibles} de {c.cupos} cupos disponibles</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={(c.ocupados / c.cupos) * 100} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="inscripcion" className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Inscríbete a la convocatoria</CardTitle>
            <CardDescription>
              Costo de inscripción: {formatCLP(9990)} (pago único).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Inscribirte y pagar no confirma automáticamente tu estatus de socio fundador (requiere
                verificación tributaria/laboral posterior) ni te garantiza un cupo en el sorteo del viaje a
                China (50 cupos entre todas las inscritas con pago confirmado).
              </p>
            </div>
            {!flowHabilitado && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p>
                  El pago en línea todavía no está habilitado (falta configurar el proveedor de pago). Puedes
                  inscribirte y tu cupo queda reservado como <strong>pago pendiente de habilitar</strong> — no se
                  te cobrará nada hasta que el pago esté activo.
                </p>
              </div>
            )}

            {result ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
                <h3 className="text-xl font-bold">¡Inscripción registrada!</h3>
                <p className="max-w-sm text-muted-foreground">
                  {result.status === "pago_no_habilitado"
                    ? "Tu cupo quedó reservado. Te contactaremos para habilitar el pago."
                    : "Revisa tu correo para completar el proceso."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="comunaId">Comuna</Label>
                  <Select id="comunaId" name="comunaId" required defaultValue="">
                    <option value="" disabled>Selecciona tu comuna</option>
                    {comunas.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.disponibles === 0}>
                        {c.nombre} {c.disponibles === 0 ? "(sin cupos)" : `(${c.disponibles} cupos)`}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="companyName">Nombre de la empresa</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
                <div>
                  <Label htmlFor="rut">RUT de la empresa</Label>
                  <Input id="rut" name="rut" required placeholder="76.123.456-7" />
                </div>
                <div>
                  <Label htmlFor="contactName">Persona de contacto</Label>
                  <Input id="contactName" name="contactName" required />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Correo electrónico</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" required />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Teléfono</Label>
                  <Input id="contactPhone" name="contactPhone" required placeholder="+56 9 1234 5678" />
                </div>
                {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
                <Button type="submit" size="lg" className="sm:col-span-2" disabled={loading}>
                  {loading ? "Procesando..." : flowHabilitado ? "Continuar al pago" : "Reservar mi cupo"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
