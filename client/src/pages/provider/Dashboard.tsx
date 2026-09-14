import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatCLP } from "@/lib/utils";
import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";
import {
  CreditCard,
  ShieldCheck,
  GraduationCap,
  CalendarClock,
  User,
  Leaf,
  Award,
  Info,
  Lock,
  Unlock,
  TrendingUp,
} from "lucide-react";

interface CardEventT {
  id: number;
  action: string;
  note: string;
  createdAt: string;
}
interface CardTransactionT {
  id: number;
  description: string;
  amount: string;
  createdAt: string;
}
interface GreenFinancingProjectT {
  id: number;
  projectName: string;
  investmentAmount: string;
  fundsDestination: string;
  background: string;
  status: string;
  createdAt: string;
}
interface PointsLedgerEntryT {
  id: number;
  points: number;
  type: "otorgado" | "ajuste" | "reversion";
  note: string;
  createdAt: string;
}
interface ImpactRecordT {
  id: number;
  financingProjectId: number | null;
  baselinePeriod: string;
  period: string;
  activity: string;
  consumptionValue: string;
  consumptionUnit: string;
  emissionFactor: string;
  factorVersion: string;
  method: string;
  evidenceNotes: string;
  estimatedReductionTco2e: string;
  validatedReductionTco2e: string | null;
  status: string;
  createdAt: string;
  pointsLedger: PointsLedgerEntryT[];
}

interface DashboardData {
  provider: { companyName: string; plan: string; developmentLevel: number; region: string };
  account?: { balance: string; creditLine: string; status: string; cardNumberMasked: string };
  policies: { id: number; coverageType: string; status: string; source: string }[];
  enrollments: { id: number; title: string; category: string; progress: number; completed: boolean }[];
  upcomingSessions: { id: number; topic: string; scheduledAt: string }[];
  executive?: { fullName: string; title: string; email: string };
  cardEvents: CardEventT[];
  cardTransactions: CardTransactionT[];
  greenFinancingProjects: GreenFinancingProjectT[];
  impactRecords: ImpactRecordT[];
}

const FINANCING_STATUS_LABEL: Record<string, string> = {
  preparacion: "En preparación",
  postulado: "Postulado (esperando a la entidad financiera)",
  en_evaluacion_entidad: "En evaluación por la entidad financiera",
  aprobado_por_entidad: "Aprobado por la entidad financiera",
  rechazado_por_entidad: "Rechazado por la entidad financiera",
};

const IMPACT_STATUS_LABEL: Record<string, { label: string; variant: "default" | "success" | "accent" | "primary" }> = {
  estimado: { label: "Estimado (autoreportado)", variant: "default" },
  en_revision: { label: "En revisión", variant: "accent" },
  validado: { label: "Validado por la empresa", variant: "success" },
  rechazado: { label: "Rechazado", variant: "default" },
  ajustado: { label: "Ajustado", variant: "primary" },
  revertido: { label: "Revertido", variant: "default" },
};

type Tab = "resumen" | "tarjeta" | "financiamiento" | "impacto";

export default function ProviderDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("resumen");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "provider")) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  function reload() {
    api<DashboardData>("/api/provider/dashboard").then(setData).catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (user?.role === "provider") reload();
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 font-extrabold">
            <img src={logoProveedorRegional} alt="Proveedor Regional" className="h-16 w-16 rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.fullName}</span>
            <Button variant="outline" size="sm" onClick={() => logout().then(() => navigate("/"))}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && <p className="text-destructive">{error}</p>}
        {data && (
          <>
            <h1 className="text-2xl font-bold">{data.provider.companyName}</h1>
            <p className="text-muted-foreground">
              {data.provider.region} · Plan {data.provider.plan}
            </p>

            <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
              {([
                ["resumen", "Resumen"],
                ["tarjeta", "Mi cuenta y tarjeta"],
                ["financiamiento", "Financiamiento verde"],
                ["impacto", "Impacto y puntos"],
              ] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                    tab === key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === "resumen" && <ResumenTab data={data} />}
              {tab === "tarjeta" && <TarjetaTab data={data} onChanged={reload} />}
              {tab === "financiamiento" && <FinanciamientoTab data={data} onChanged={reload} />}
              {tab === "impacto" && <ImpactoTab data={data} onChanged={reload} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ResumenTab({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ShieldCheck className="h-5 w-5 text-success" />
            <CardTitle className="text-base">Protección</CardTitle>
          </CardHeader>
          <CardContent>
            {data.policies.length > 0 ? (
              <>
                <p className="text-sm font-medium">{data.policies[0].coverageType}</p>
                <Badge variant="success" className="mt-2">{data.policies[0].status}</Badge>
                <p className="mt-2 text-xs text-muted-foreground">
                  {data.policies[0].source === "nico_seguros"
                    ? "Póliza real emitida vía Nico Seguros."
                    : "Cobertura simulada — sin pagos ni siniestros reales (integración con Nico Seguros preparada, pendiente de credenciales)."}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cobertura activa</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mi ejecutivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{data.executive?.fullName ?? "Sin asignar"}</p>
            <p className="text-xs text-muted-foreground">{data.executive?.title}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nivel de desarrollo</CardTitle>
            <CardDescription>Sigue avanzando en el programa</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={data.provider.developmentLevel} />
            <p className="mt-2 text-sm text-muted-foreground">{data.provider.developmentLevel}% completado</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Próxima asesoría</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingSessions.length > 0 ? (
              <>
                <p className="text-sm font-medium">{data.upcomingSessions[0].topic}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(data.upcomingSessions[0].scheduledAt).toLocaleString("es-CL")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No tienes asesorías agendadas</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mis cursos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.enrollments.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes cursos inscritos.</p>}
            <ul className="divide-y divide-border">
              {data.enrollments.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.category}</p>
                  </div>
                  <div className="w-32">
                    <Progress value={c.progress} />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{c.progress}%</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TarjetaTab({ data, onChanged }: { data: DashboardData; onChanged: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runControl(action: "activar" | "bloquear" | "solicitar_aumento_cupo") {
    setLoading(action);
    setError(null);
    try {
      await api("/api/provider/card/controls", { method: "POST", body: JSON.stringify({ action }) });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  const status = data.account?.status ?? "pendiente";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Interfaz de integración preparada — el módulo externo que emite y administra la tarjeta aún no está
          identificado ni revisado. Hoy esta sección funciona en <strong>modo simulado</strong>: sin movimientos de
          dinero reales.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Tarjeta Proveedor Regional</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-lg">{data.account?.cardNumberMasked ?? "No emitida"}</p>
            <Badge variant={status === "activa" ? "success" : status === "bloqueada" ? "default" : "accent"} className="mt-2">
              {status}
            </Badge>
            <p className="mt-4 text-2xl font-bold">{formatCLP(data.account?.balance ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Línea disponible {formatCLP(data.account?.creditLine ?? 0)}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => runControl("activar")}>
                <Unlock className="h-4 w-4" /> Activar
              </Button>
              <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => runControl("bloquear")}>
                <Lock className="h-4 w-4" /> Bloquear
              </Button>
              <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => runControl("solicitar_aumento_cupo")}>
                Solicitar aumento de cupo
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              El aumento de cupo queda registrado como solicitud; la línea de crédito la define la entidad financiera.
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos y controles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Movimientos</p>
            {data.cardTransactions.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos.</p>}
            <ul className="mb-4 divide-y divide-border">
              {data.cardTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{t.description}</span>
                  <span className="font-medium">{formatCLP(t.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Historial de controles</p>
            {data.cardEvents.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}
            <ul className="divide-y divide-border">
              {data.cardEvents.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <span className="font-medium capitalize">{e.action.replace(/_/g, " ")}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString("es-CL")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinanciamientoTab({ data, onChanged }: { data: DashboardData; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/provider/green-financing", {
        method: "POST",
        body: JSON.stringify({
          projectName: form.get("projectName"),
          investmentAmount: form.get("investmentAmount"),
          fundsDestination: form.get("fundsDestination"),
          background: form.get("background"),
        }),
      });
      setShowForm(false);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          La aprobación del financiamiento corresponde siempre a la entidad financiera. Proveedor Regional no aprueba ni
          desembolsa fondos: solo registra tu postulación y el estado que esa entidad informe.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tus proyectos de inversión</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Nueva postulación"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="projectName">Nombre del proyecto</Label>
                <Input id="projectName" name="projectName" required placeholder="Ej. Recambio de flota a eléctrica" />
              </div>
              <div>
                <Label htmlFor="investmentAmount">Monto solicitado (CLP)</Label>
                <Input id="investmentAmount" name="investmentAmount" type="number" min="1" required />
              </div>
              <div>
                <Label htmlFor="fundsDestination">Destino de los fondos</Label>
                <Input id="fundsDestination" name="fundsDestination" required placeholder="Ej. Compra de vehículos" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="background">Antecedentes</Label>
                <Textarea id="background" name="background" placeholder="Contexto, respaldo técnico, etc." />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="sm:col-span-2">
                {loading ? "Enviando..." : "Enviar postulación"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {data.greenFinancingProjects.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aún no tienes proyectos de financiamiento verde.</p>
      )}

      <div className="grid gap-4">
        {data.greenFinancingProjects.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">{p.projectName}</CardTitle>
              <CardDescription>{p.fundsDestination}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatCLP(p.investmentAmount)}</p>
              {p.background && <p className="mt-1 text-sm text-muted-foreground">{p.background}</p>}
              <Badge variant="accent" className="mt-3">
                {FINANCING_STATUS_LABEL[p.status] ?? p.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ImpactoTab({ data, onChanged }: { data: DashboardData; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await api("/api/provider/impact-records", {
        method: "POST",
        body: JSON.stringify({
          financingProjectId: form.get("financingProjectId") || undefined,
          baselinePeriod: form.get("baselinePeriod"),
          period: form.get("period"),
          activity: form.get("activity"),
          consumptionValue: form.get("consumptionValue"),
          consumptionUnit: form.get("consumptionUnit"),
          emissionFactor: form.get("emissionFactor"),
          factorVersion: form.get("factorVersion"),
          method: form.get("method"),
          evidenceNotes: form.get("evidenceNotes"),
        }),
      });
      setShowForm(false);
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Los puntos son incentivos internos del programa Proveedor Regional — no son créditos de carbono ni dinero, y no
          existe (todavía) una equivalencia oficial de puntos por tCO2e. La reducción que reportas aquí es una{" "}
          <strong>estimación</strong>: solo se vuelve "validada" cuando la empresa patrocinadora revisa tu evidencia.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tus registros de impacto</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Autoreportar reducción"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {data.greenFinancingProjects.length > 0 && (
                <div className="sm:col-span-2">
                  <Label htmlFor="financingProjectId">Proyecto de inversión asociado (opcional)</Label>
                  <select
                    id="financingProjectId"
                    name="financingProjectId"
                    className="flex h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Sin asociar</option>
                    {data.greenFinancingProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.projectName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label htmlFor="baselinePeriod">Línea base</Label>
                <Input id="baselinePeriod" name="baselinePeriod" required placeholder="Ej. 2024" />
              </div>
              <div>
                <Label htmlFor="period">Período medido</Label>
                <Input id="period" name="period" required placeholder="Ej. 2025-Q1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="activity">Actividad</Label>
                <Input id="activity" name="activity" required placeholder="Ej. Reemplazo de flota diésel por eléctrica" />
              </div>
              <div>
                <Label htmlFor="consumptionValue">Consumo</Label>
                <Input id="consumptionValue" name="consumptionValue" type="number" step="0.001" min="0" required />
              </div>
              <div>
                <Label htmlFor="consumptionUnit">Unidad de consumo</Label>
                <Input id="consumptionUnit" name="consumptionUnit" required placeholder="Ej. litros diésel, kWh" />
              </div>
              <div>
                <Label htmlFor="emissionFactor">Factor de emisión</Label>
                <Input id="emissionFactor" name="emissionFactor" type="number" step="0.000001" min="0" required />
              </div>
              <div>
                <Label htmlFor="factorVersion">Versión del factor</Label>
                <Input id="factorVersion" name="factorVersion" required placeholder="Ej. DEMO v1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="method">Método</Label>
                <Textarea id="method" name="method" required placeholder="Metodología de cálculo aplicada" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="evidenceNotes">Evidencias</Label>
                <Textarea id="evidenceNotes" name="evidenceNotes" placeholder="Descripción o enlaces a respaldos" />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="sm:col-span-2">
                {loading ? "Enviando..." : "Enviar autoreporte"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {data.impactRecords.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aún no tienes registros de impacto.</p>
      )}

      <div className="grid gap-4">
        {data.impactRecords.map((r) => {
          const statusInfo = IMPACT_STATUS_LABEL[r.status] ?? { label: r.status, variant: "default" as const };
          const totalPoints = r.pointsLedger.reduce((sum, p) => sum + p.points, 0);
          return (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{r.activity}</CardTitle>
                  <CardDescription>
                    Línea base {r.baselinePeriod} · Período {r.period}
                  </CardDescription>
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Consumo:</span> {r.consumptionValue} {r.consumptionUnit}</p>
                  <p><span className="text-muted-foreground">Factor y versión:</span> {r.emissionFactor} ({r.factorVersion})</p>
                  <p className="sm:col-span-2"><span className="text-muted-foreground">Método:</span> {r.method}</p>
                  {r.evidenceNotes && (
                    <p className="sm:col-span-2"><span className="text-muted-foreground">Evidencias:</span> {r.evidenceNotes}</p>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5" /> Reducción estimada
                    </p>
                    <p className="mt-1 text-lg font-bold">{Number(r.estimatedReductionTco2e).toFixed(3)} tCO2e</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                      <Leaf className="h-3.5 w-3.5" /> Reducción validada
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      {r.validatedReductionTco2e ? `${Number(r.validatedReductionTco2e).toFixed(3)} tCO2e` : "Pendiente de revisión"}
                    </p>
                  </div>
                </div>

                {r.pointsLedger.length > 0 && (
                  <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase text-accent">
                      <Award className="h-3.5 w-3.5" /> Puntos (incentivo interno, no dinero ni créditos de carbono)
                    </p>
                    <p className="mt-1 text-lg font-bold">{totalPoints} puntos</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {r.pointsLedger.map((p) => (
                        <li key={p.id}>
                          {p.type} {p.points > 0 ? "+" : ""}{p.points} — {new Date(p.createdAt).toLocaleDateString("es-CL")}
                          {p.note ? ` · ${p.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Beneficios del programa</CardTitle>
          <CardDescription>Sujetos a definición — ejemplos posibles</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            <li>Cursos de la Academia Proveedor Regional</li>
            <li>Asesorías especializadas</li>
            <li>Convenios con proveedores de servicios</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
