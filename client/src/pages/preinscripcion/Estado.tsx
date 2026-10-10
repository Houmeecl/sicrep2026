import { useCallback, useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { MemberCard } from "@/components/MemberCard";
import { apiPre, rememberToken, uploadDocumento, walletHref, KYC_LABEL, PAGO_LABEL, DOC_LABEL } from "@/lib/preinscripcion";
import { formatCLP } from "@/lib/utils";
import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";
import { CheckCircle2, Circle, Clock, AlertTriangle, Upload, ExternalLink } from "lucide-react";

interface Vista {
  id: number;
  folio: string;
  tipoContribuyente: string;
  razonSocial: string;
  rut: string;
  comuna: string;
  repNombre: string;
  email: string;
  emailVerificado: boolean;
  monto: number;
  paymentStatus: string;
  pagoHabilitado: boolean;
  kycStatus: string;
  kycNota: string;
  documentos: { id: number; tipo: string; nombre: string; bytes: number; subidoAt: string }[];
  documentosObligatorios: string[];
  documentosFaltantes: string[];
  tarjeta: {
    estado: "no_emitida" | "vigente" | "vencida" | "revocada";
    memberCode?: string;
    validaHasta?: string;
    verificacionUrl?: string;
    qrSvg?: string;
    appleWallet?: boolean;
    googleWallet?: boolean;
  };
}

function Paso({ done, active, title, children }: { done: boolean; active: boolean; title: string; children?: React.ReactNode }) {
  return (
    <Card className={active ? "border-violet/60 shadow-md" : ""}>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        {done ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-label="Completado" />
        ) : active ? (
          <Clock className="h-6 w-6 shrink-0 text-violet" aria-label="En curso" />
        ) : (
          <Circle className="h-6 w-6 shrink-0 text-muted-foreground" aria-label="Pendiente" />
        )}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      {active && children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function Estado() {
  const params = new URLSearchParams(useSearch());
  const id = params.get("id");
  const errorParam = params.get("error");
  const [v, setV] = useState<Vista | null>(null);
  const [error, setError] = useState<string | null>(errorParam === "pago" ? "No pudimos confirmar el pago con Flow. Si se te cobró, escríbenos a soporte@sicr3p.cl." : null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) rememberToken(id, params.get("t"));
    // Quita el token de la barra de direcciones para que no quede en el historial compartido.
    if (params.get("t")) window.history.replaceState(null, "", `/preinscripcion/estado?id=${id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(() => {
    if (!id) return;
    apiPre<Vista>(id, `/api/preinscripcion/${id}`)
      .then(setV)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  // Mientras el pago o la revisión están en curso, refresca solo.
  useEffect(() => {
    if (!v) return;
    const esperando = v.paymentStatus === "en_proceso" || (v.paymentStatus === "pagado" && v.tarjeta.estado === "no_emitida");
    if (!esperando) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [v, load]);

  async function run<T>(fn: () => Promise<T>, ok?: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await fn();
      if (ok) setMsg(ok);
      return r;
    } catch (e: any) {
      setError(e.message ?? "Ocurrió un error");
    } finally {
      setBusy(false);
    }
  }

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center">
          <p>{error ?? "Falta el número de preinscripción."}</p>
          <Link href="/preinscripcion" className="mt-4 inline-block font-semibold text-primary underline">
            Ir a la preinscripción
          </Link>
        </Card>
      </div>
    );
  }

  const pagado = v?.paymentStatus === "pagado";
  const docsOk = v ? v.documentosFaltantes.length === 0 : false;
  const listoParaPagar = Boolean(v?.emailVerificado && docsOk && !pagado);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/">
            <img src={logoProveedorRegional} alt="Proveedor Regional" className="h-14 w-14 rounded-lg" />
          </Link>
          {v && <span className="font-mono text-sm text-muted-foreground">{v.folio}</span>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Tu preinscripción</h1>
        {v && (
          <p className="text-muted-foreground">
            {v.razonSocial} · RUT {v.rut} · {v.comuna}
          </p>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {msg && (
          <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
            {msg}
          </div>
        )}

        {v && (
          <>
            <Paso done title="Datos y declaraciones registrados" active={false} />

            <Paso done={v.emailVerificado} active={!v.emailVerificado} title={`Verifica tu correo (${v.email})`}>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const codigo = String(new FormData(e.currentTarget).get("codigo") ?? "");
                  run(() => apiPre<Vista>(id, `/api/preinscripcion/${id}/otp/verificar`, { method: "POST", body: JSON.stringify({ codigo }) }).then(setV), "Correo verificado");
                }}
              >
                <div>
                  <Label htmlFor="codigo">Código de 6 dígitos</Label>
                  <Input id="codigo" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="w-40 font-mono tracking-widest" />
                </div>
                <Button type="submit" disabled={busy}>
                  Verificar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        apiPre<{ accessToken: string }>(id, `/api/preinscripcion/${id}/otp/reenviar`, { method: "POST" }).then((r) =>
                          rememberToken(id, r.accessToken)
                        ),
                      "Te enviamos un código nuevo y un enlace personal actualizado"
                    )
                  }
                >
                  Reenviar código
                </Button>
              </form>
            </Paso>

            <Paso
              done={docsOk && (pagado || v.kycStatus !== "observado")}
              active={v.emailVerificado && (!docsOk || v.kycStatus === "observado") && v.kycStatus !== "rechazado"}
              title="Sube tus documentos"
            >
              {v.kycStatus === "observado" && (
                <div className="mb-4 flex gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-accent" />
                  <span>
                    <strong>Observación del revisor:</strong> {v.kycNota}
                  </span>
                </div>
              )}
              <p className="mb-3 text-sm text-muted-foreground">PDF, JPG o PNG, hasta 8 MB. Los documentos solo los ve el equipo de verificación.</p>
              <ul className="space-y-3">
                {v.documentosObligatorios.map((tipo) => {
                  const subido = v.documentos.find((d) => d.tipo === tipo);
                  return (
                    <li key={tipo} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <span className="flex items-center gap-2 text-sm">
                        {subido ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                        {DOC_LABEL[tipo] ?? tipo}
                        {subido && <span className="text-xs text-muted-foreground">({subido.nombre})</span>}
                      </span>
                      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">
                        <Upload className="h-4 w-4" /> {subido ? "Reemplazar" : "Subir"}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="sr-only"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) run(() => uploadDocumento(id, tipo, file).then(setV), "Documento cargado");
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
              {v.kycStatus === "observado" && (
                <Button
                  className="mt-4"
                  disabled={busy || !docsOk}
                  onClick={() => run(() => apiPre<Vista>(id, `/api/preinscripcion/${id}/reenviar-revision`, { method: "POST" }).then(setV), "Enviado nuevamente a revisión")}
                >
                  Enviar a revisión
                </Button>
              )}
            </Paso>

            <Paso done={pagado} active={listoParaPagar} title={`Paga la preinscripción (${formatCLP(v.monto)})`}>
              <p className="mb-3 text-sm text-muted-foreground">
                Pago seguro con Flow: Webpay, tarjetas de débito o crédito y transferencia. Estado actual:{" "}
                <strong>{PAGO_LABEL[v.paymentStatus] ?? v.paymentStatus}</strong>.
              </p>
              {v.pagoHabilitado ? (
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await apiPre<{ redirectUrl: string }>(id, `/api/preinscripcion/${id}/pago`, { method: "POST" });
                      window.location.href = r.redirectUrl;
                    })
                  }
                >
                  Pagar {formatCLP(v.monto)} con Flow
                </Button>
              ) : (
                <p className="rounded-lg bg-muted p-3 text-sm">
                  El pago en línea aún no está habilitado. No se te cobrará nada; te avisaremos por correo cuando puedas pagar.
                </p>
              )}
            </Paso>

            <Paso
              done={v.kycStatus === "aprobado"}
              active={pagado && v.kycStatus !== "aprobado"}
              title={`Verificación de identidad: ${KYC_LABEL[v.kycStatus] ?? v.kycStatus}`}
            >
              {v.kycStatus === "pendiente_revision" && (
                <p className="text-sm text-muted-foreground">Estamos revisando tus antecedentes. Te avisaremos por correo; esta página se actualiza sola.</p>
              )}
              {v.kycStatus === "rechazado" && (
                <p className="text-sm">
                  <strong>No aprobada:</strong> {v.kycNota}
                </p>
              )}
            </Paso>

            <Paso done={v.tarjeta.estado === "vigente"} active={v.tarjeta.estado !== "no_emitida"} title="Tu tarjeta de membresía">
              {v.tarjeta.estado !== "no_emitida" && v.tarjeta.memberCode && (
                <div className="grid gap-6 sm:grid-cols-[300px_1fr] sm:items-start">
                  <MemberCard
                    razonSocial={v.razonSocial}
                    memberCode={v.tarjeta.memberCode}
                    validaHasta={v.tarjeta.validaHasta!}
                    estado={v.tarjeta.estado}
                    qrSvg={v.tarjeta.qrSvg!}
                  />
                  <div className="space-y-3">
                    <Badge variant={v.tarjeta.estado === "vigente" ? "success" : "default"}>
                      {v.tarjeta.estado === "vigente" ? "Vigente" : v.tarjeta.estado === "vencida" ? "Vencida" : "Revocada"}
                    </Badge>
                    {v.tarjeta.appleWallet && (
                      <a href={walletHref(id, "apple")} className="flex h-12 items-center justify-center rounded-lg bg-black px-5 text-sm font-semibold text-white">
                        Agregar a Apple Wallet
                      </a>
                    )}
                    {v.tarjeta.googleWallet && (
                      <a href={walletHref(id, "google")} className="flex h-12 items-center justify-center rounded-lg bg-[#1f1f1f] px-5 text-sm font-semibold text-white">
                        Agregar a Google Wallet
                      </a>
                    )}
                    {v.tarjeta.estado === "vigente" && !v.tarjeta.appleWallet && !v.tarjeta.googleWallet && (
                      <p className="text-sm text-muted-foreground">Los pases para Apple y Google Wallet estarán disponibles pronto. Tu tarjeta ya es válida con su QR.</p>
                    )}
                    <a href={v.tarjeta.verificacionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline">
                      Comprobar validez <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </Paso>
          </>
        )}

        <p className="pt-4 text-center text-sm text-muted-foreground">
          ¿Dudas? soporte@sicr3p.cl · <a className="underline" href="https://www.sicr3p.cl">www.sicr3p.cl</a>
        </p>
      </main>
    </div>
  );
}
