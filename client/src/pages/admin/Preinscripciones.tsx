import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { KYC_LABEL, PAGO_LABEL } from "@/lib/preinscripcion";
import { formatRut } from "@shared/rut";
import { FileText, AlertTriangle } from "lucide-react";

interface Fila {
  id: number;
  folio: string;
  razonSocial: string;
  rut: string;
  comuna: string;
  email: string;
  emailVerificado: boolean;
  esPep: boolean;
  paymentStatus: string;
  kycStatus: string;
  cardStatus: string;
  memberCode: string | null;
  createdAt: string;
}

interface Detalle extends Record<string, any> {
  documentos: { id: number; tipo: string; label: string; nombreOriginal: string; bytes: number; sha256: string; createdAt: string }[];
  documentosFaltantes: string[];
  beneficiariosFinales: { nombre: string; rut: string; porcentaje: number }[];
  eventos: { id: number; tipo: string; detalle: string; ip: string | null; createdAt: string }[];
  estadoTarjeta: string;
}

const dt = (d?: string | null) => (d ? new Date(d).toLocaleString("es-CL", { timeZone: "America/Santiago" }) : "—");

export default function AdminPreinscripciones() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Fila[]>([]);
  const [filtro, setFiltro] = useState("pendiente_revision");
  const [sel, setSel] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api<Fila[]>("/api/admin/preinscripciones").then(setRows).catch((e) => setError(e.message));
  }
  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);

  async function abrir(id: number) {
    setError(null);
    try {
      setSel(await api<Detalle>(`/api/admin/preinscripciones/${id}`));
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function accion(path: string, body: object) {
    if (!sel) return;
    setBusy(true);
    setError(null);
    try {
      setSel(await api<Detalle>(`/api/admin/preinscripciones/${sel.id}/${path}`, { method: "POST", body: JSON.stringify(body) }));
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;
  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-sm p-6 text-center">
          <p>Esta sección es solo para administradores.</p>
          <Link href="/login" className="mt-4 inline-block font-semibold text-primary underline">
            Iniciar sesión
          </Link>
        </Card>
      </div>
    );
  }

  const visibles = rows.filter((r) => filtro === "todas" || r.kycStatus === filtro);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[420px_1fr]">
        <section>
          <h1 className="text-2xl font-extrabold">Preinscripciones</h1>
          <div className="mt-4">
            <Label htmlFor="filtro">Mostrar</Label>
            <Select id="filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="pendiente_revision">En revisión (pagadas)</option>
              <option value="observado">Con observaciones</option>
              <option value="borrador">Sin pagar</option>
              <option value="aprobado">Aprobadas</option>
              <option value="rechazado">Rechazadas</option>
              <option value="todas">Todas</option>
            </Select>
          </div>
          <ul className="mt-4 space-y-2">
            {visibles.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => abrir(r.id)}
                  className={`w-full rounded-lg border p-3 text-left hover:bg-muted ${sel?.id === r.id ? "border-violet" : "border-border"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{r.razonSocial}</span>
                    {r.esPep && <Badge variant="accent">PEP</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.folio} · {formatRut(r.rut)} · {r.comuna}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge>{PAGO_LABEL[r.paymentStatus] ?? r.paymentStatus}</Badge>
                    <Badge variant="primary">{KYC_LABEL[r.kycStatus] ?? r.kycStatus}</Badge>
                    {r.memberCode && <Badge variant="success">{r.memberCode}</Badge>}
                  </div>
                </button>
              </li>
            ))}
            {visibles.length === 0 && <li className="text-sm text-muted-foreground">No hay preinscripciones en este estado.</li>}
          </ul>
        </section>

        <section>
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {!sel && <p className="text-muted-foreground">Selecciona una preinscripción para revisarla.</p>}
          {sel && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {sel.razonSocial} <span className="font-mono text-sm text-muted-foreground">{sel.folio}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd>{sel.tipoContribuyente === "persona_juridica" ? "Persona jurídica" : "Persona natural con giro"}</dd>
                    <dt className="text-muted-foreground">RUT</dt>
                    <dd className="font-mono">{formatRut(sel.rut)}</dd>
                    <dt className="text-muted-foreground">Giro</dt>
                    <dd>{sel.giro}</dd>
                    <dt className="text-muted-foreground">Dirección</dt>
                    <dd>
                      {sel.direccion}, {sel.comuna}
                    </dd>
                    <dt className="text-muted-foreground">Representante</dt>
                    <dd>
                      {sel.repNombre} · {formatRut(sel.repRut)} · {sel.repCargo}
                    </dd>
                    <dt className="text-muted-foreground">Contacto</dt>
                    <dd>
                      {sel.email} {sel.emailVerificadoAt ? "(verificado)" : "(sin verificar)"} · {sel.telefono}
                    </dd>
                    <dt className="text-muted-foreground">PEP</dt>
                    <dd className={sel.esPep ? "font-semibold text-accent" : ""}>{sel.esPep ? `Sí — ${sel.pepDetalle}` : "No"}</dd>
                    <dt className="text-muted-foreground">Beneficiarios finales</dt>
                    <dd>
                      {sel.beneficiariosFinales.length === 0
                        ? "—"
                        : sel.beneficiariosFinales.map((b) => `${b.nombre} (${formatRut(b.rut)}, ${b.porcentaje}%)`).join(" · ")}
                    </dd>
                    <dt className="text-muted-foreground">Pago</dt>
                    <dd>
                      {PAGO_LABEL[sel.paymentStatus] ?? sel.paymentStatus}
                      {sel.flowFlowOrder ? ` · Flow ${sel.flowFlowOrder}` : ""} {sel.paidAt ? `· ${dt(sel.paidAt)}` : ""}
                    </dd>
                    <dt className="text-muted-foreground">Consentimiento</dt>
                    <dd>
                      Términos {sel.aceptaTerminosVersion} · {dt(sel.consentimientoDatosAt)} · IP {sel.consentimientoIp}
                    </dd>
                    <dt className="text-muted-foreground">Tarjeta</dt>
                    <dd>
                      {sel.estadoTarjeta}
                      {sel.memberCode ? ` · ${sel.memberCode} · vence ${dt(sel.cardValidaHasta)}` : ""}
                    </dd>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {sel.documentosFaltantes.length > 0 && (
                    <p className="mb-3 flex items-center gap-2 text-sm text-accent">
                      <AlertTriangle className="h-4 w-4" /> Faltan: {sel.documentosFaltantes.join(", ")}
                    </p>
                  )}
                  <ul className="space-y-2 text-sm">
                    {sel.documentos.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                        <span>
                          <strong>{d.label}</strong> · {d.nombreOriginal} · {(d.bytes / 1024).toFixed(0)} KB · {dt(d.createdAt)}
                          <br />
                          <span className="font-mono text-xs text-muted-foreground">sha256 {d.sha256}</span>
                        </span>
                        <a
                          href={`/api/admin/preinscripciones/${sel.id}/documentos/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-3 font-semibold hover:bg-muted"
                        >
                          <FileText className="h-4 w-4" /> Ver
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {["pendiente_revision", "observado"].includes(sel.kycStatus) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Decisión KYC</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const decision = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
                        accion("kyc", { decision, nota: String(f.get("nota") ?? "") });
                      }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-muted-foreground">
                        Comprueba: cédula vigente y coincidente con el representante; inicio de actividades del RUT; poderes vigentes; PEP y
                        beneficiarios finales razonables. Al aprobar se emite la tarjeta de inmediato.
                      </p>
                      <div>
                        <Label htmlFor="nota">Nota para el postulante (obligatoria si observas o rechazas)</Label>
                        <Textarea id="nota" name="nota" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" value="aprobado" variant="primary" disabled={busy}>
                          Aprobar y emitir tarjeta
                        </Button>
                        <Button type="submit" value="observado" variant="outline" disabled={busy}>
                          Observar
                        </Button>
                        <Button type="submit" value="rechazado" variant="outline" disabled={busy} className="text-destructive">
                          Rechazar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {sel.cardStatus === "vigente" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Revocar tarjeta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const motivo = String(new FormData(e.currentTarget).get("motivo") ?? "");
                        if (window.confirm("La tarjeta dejará de validar de inmediato. ¿Continuar?")) accion("revocar", { motivo });
                      }}
                    >
                      <Label htmlFor="motivo">Motivo</Label>
                      <Textarea id="motivo" name="motivo" required minLength={3} />
                      <Button type="submit" variant="outline" className="text-destructive" disabled={busy}>
                        Revocar
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bitácora</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1 text-xs">
                    {sel.eventos.map((ev) => (
                      <li key={ev.id} className="grid grid-cols-[150px_170px_1fr] gap-2">
                        <span className="text-muted-foreground">{dt(ev.createdAt)}</span>
                        <span className="font-mono">{ev.tipo}</span>
                        <span className="break-all">
                          {ev.detalle} {ev.ip ? `· ${ev.ip}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
