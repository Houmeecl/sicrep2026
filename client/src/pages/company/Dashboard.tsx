import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Users, TrendingUp, Mountain, Leaf, Info } from "lucide-react";

interface ImpactPanel {
  company: { companyName: string };
  totalProviders: number;
  avgDevelopment: number;
  providers: {
    providerId: number;
    companyName: string;
    region: string;
    developmentLevel: number;
    plan: string;
    hasActiveProtection: boolean;
  }[];
}

interface PendingRecord {
  id: number;
  providerName: string;
  activity: string;
  baselinePeriod: string;
  period: string;
  consumptionValue: string;
  consumptionUnit: string;
  emissionFactor: string;
  factorVersion: string;
  method: string;
  evidenceNotes: string;
  estimatedReductionTco2e: string;
  validatedReductionTco2e: string | null;
  status: string;
  pointsLedger: { id: number; points: number; type: string }[];
}

const IMPACT_STATUS_LABEL: Record<string, string> = {
  estimado: "Estimado (autoreportado)",
  en_revision: "En revisión",
  validado: "Validado",
  rechazado: "Rechazado",
  ajustado: "Ajustado",
  revertido: "Revertido",
};

function ReviewRow({ record, onChanged }: { record: PendingRecord; onChanged: () => void }) {
  const [validatedValue, setValidatedValue] = useState(record.estimatedReductionTco2e);
  const [note, setNote] = useState("");
  const [pointsValue, setPointsValue] = useState<string>("");
  const [suggestedLabel, setSuggestedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasGrant = record.pointsLedger.some((p) => p.type === "otorgado");
  const totalPoints = record.pointsLedger.reduce((sum, p) => sum + p.points, 0);

  async function loadSuggestion() {
    try {
      const res = await api<{ suggestedPoints: number; label: string }>(
        `/api/points/demo-suggestion/${validatedValue || 0}`
      );
      setPointsValue(String(res.suggestedPoints));
      setSuggestedLabel(res.label);
    } catch {
      // no bloquea el flujo si falla
    }
  }

  async function handleReview(decision: "validado" | "rechazado") {
    setError(null);
    setLoading(true);
    try {
      await api(`/api/company/impact-records/${record.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          validatedReductionTco2e: decision === "validado" ? validatedValue : undefined,
          note,
        }),
      });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGrant() {
    setError(null);
    setLoading(true);
    try {
      await api(`/api/company/impact-records/${record.id}/grant-points`, {
        method: "POST",
        body: JSON.stringify({ points: Number(pointsValue), note }),
      });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustment(type: "ajuste" | "reversion") {
    setError(null);
    setLoading(true);
    try {
      await api(`/api/company/impact-records/${record.id}/points-adjustment`, {
        method: "POST",
        body: JSON.stringify({ points: Number(pointsValue) || 0, type, note: note || "Ajuste manual" }),
      });
      onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{record.activity}</CardTitle>
          <CardDescription>
            {record.providerName} · Línea base {record.baselinePeriod} · Período {record.period}
          </CardDescription>
        </div>
        <Badge variant={record.status === "validado" ? "success" : "accent"}>
          {IMPACT_STATUS_LABEL[record.status] ?? record.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Consumo:</span> {record.consumptionValue} {record.consumptionUnit}</p>
          <p><span className="text-muted-foreground">Factor y versión:</span> {record.emissionFactor} ({record.factorVersion})</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">Método:</span> {record.method}</p>
          {record.evidenceNotes && (
            <p className="sm:col-span-2"><span className="text-muted-foreground">Evidencias:</span> {record.evidenceNotes}</p>
          )}
          <p><span className="text-muted-foreground">Reducción estimada:</span> {Number(record.estimatedReductionTco2e).toFixed(3)} tCO2e</p>
          <p>
            <span className="text-muted-foreground">Reducción validada:</span>{" "}
            {record.validatedReductionTco2e ? `${Number(record.validatedReductionTco2e).toFixed(3)} tCO2e` : "—"}
          </p>
        </div>

        {(record.status === "estimado" || record.status === "en_revision") && (
          <div className="mt-4 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`val-${record.id}`}>Reducción validada (tCO2e)</Label>
              <Input
                id={`val-${record.id}`}
                type="number"
                step="0.001"
                value={validatedValue}
                onChange={(e) => setValidatedValue(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`note-${record.id}`}>Nota de revisión</Label>
              <Input id={`note-${record.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button size="sm" disabled={loading} onClick={() => handleReview("validado")}>Validar</Button>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => handleReview("rechazado")}>Rechazar</Button>
            </div>
          </div>
        )}

        {record.status === "validado" && !hasGrant && (
          <div className="mt-4 grid gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`points-${record.id}`}>Puntos a otorgar</Label>
              <Input id={`points-${record.id}`} type="number" value={pointsValue} onChange={(e) => setPointsValue(e.target.value)} />
              <button type="button" onClick={loadSuggestion} className="mt-1 text-xs text-primary underline">
                Sugerir valor {suggestedLabel ? `(${suggestedLabel})` : "(DEMO)"}
              </button>
            </div>
            <div>
              <Label htmlFor={`gnote-${record.id}`}>Nota</Label>
              <Input id={`gnote-${record.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button size="sm" disabled={loading || !pointsValue} onClick={handleGrant} className="sm:col-span-2">
              Otorgar puntos
            </Button>
          </div>
        )}

        {hasGrant && (
          <div className="mt-4 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Puntos otorgados hasta ahora: {totalPoints}</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={`adj-${record.id}`}>Puntos a ajustar/revertir</Label>
                <Input id={`adj-${record.id}`} type="number" value={pointsValue} onChange={(e) => setPointsValue(e.target.value)} className="w-32" />
              </div>
              <Button size="sm" variant="outline" disabled={loading || !pointsValue} onClick={() => handleAdjustment("ajuste")}>
                Ajustar
              </Button>
              <Button size="sm" variant="outline" disabled={loading || !pointsValue} onClick={() => handleAdjustment("reversion")}>
                Revertir
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default function CompanyDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<ImpactPanel | null>(null);
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "company_admin")) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  function reload() {
    api<ImpactPanel>("/api/company/impact").then(setData).catch((e) => setError(e.message));
    api<{ records: PendingRecord[] }>("/api/company/impact-records/pending")
      .then((r) => setRecords(r.records))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (user?.role === "company_admin") reload();
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 font-extrabold">
            <Mountain className="h-6 w-6 text-primary" />
            <span><span className="text-primary">sic</span><span className="text-accent">rep</span></span>
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
            <h1 className="text-2xl font-bold">{data.company.companyName}</h1>
            <p className="text-muted-foreground">Panel de impacto de tu cadena de proveedores</p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Proveedores patrocinados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.totalProviders}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Avance promedio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.avgDevelopment}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Proveedores</CardTitle>
                  <CardDescription>Nivel de desarrollo y estado de protección paramétrica</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.providers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no tienes proveedores vinculados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="py-2 font-medium">Empresa</th>
                            <th className="py-2 font-medium">Región</th>
                            <th className="py-2 font-medium">Plan</th>
                            <th className="py-2 font-medium">Desarrollo</th>
                            <th className="py-2 font-medium">Protección</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.providers.map((p) => (
                            <tr key={p.providerId} className="border-b border-border last:border-0">
                              <td className="py-3 font-medium">{p.companyName}</td>
                              <td className="py-3">{p.region}</td>
                              <td className="py-3 capitalize">{p.plan}</td>
                              <td className="py-3">{p.developmentLevel}%</td>
                              <td className="py-3">
                                <Badge variant={p.hasActiveProtection ? "success" : "default"}>
                                  {p.hasActiveProtection ? "Activa" : "Sin cobertura"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Leaf className="h-5 w-5 text-success" /> Revisión de impacto de tus proveedores
              </h2>
              <div className="mt-2 flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Revisa la evidencia autoreportada antes de validar. Los puntos son incentivos internos del
                  programa, no créditos de carbono ni dinero, y solo pueden otorgarse una vez por reducción
                  validada; cualquier corrección posterior queda registrada como ajuste o reversión.
                </p>
              </div>
              <div className="mt-4 grid gap-4">
                {records.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay registros de impacto de tus proveedores.</p>
                )}
                {records.map((r) => (
                  <ReviewRow key={r.id} record={r} onChanged={reload} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
