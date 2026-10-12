import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import logoProveedorRegional from "@/assets/logo-proveedor-regional.png";
import { ShieldCheck, ShieldX, ShieldAlert } from "lucide-react";

interface Resultado {
  estado: "vigente" | "vencida" | "revocada" | "no_emitida" | "no_encontrada" | "firma_invalida";
  memberCode?: string;
  razonSocial?: string;
  rut?: string;
  comuna?: string;
  tipo?: string;
  kycVerificado?: boolean;
  pagoConfirmado?: boolean;
  emitidaAt?: string;
  validaHasta?: string;
  revocadaAt?: string;
  consultadoAt?: string;
}

const fecha = (d?: string) => (d ? new Date(d).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "—");

const VISTA: Record<Resultado["estado"], { titulo: string; icon: typeof ShieldCheck; clase: string }> = {
  vigente: { titulo: "Tarjeta válida y vigente", icon: ShieldCheck, clase: "bg-success text-success-foreground" },
  vencida: { titulo: "Tarjeta vencida", icon: ShieldAlert, clase: "bg-amber-600 text-white" },
  revocada: { titulo: "Tarjeta revocada", icon: ShieldX, clase: "bg-destructive text-destructive-foreground" },
  no_emitida: { titulo: "Tarjeta no emitida", icon: ShieldAlert, clase: "bg-amber-600 text-white" },
  no_encontrada: { titulo: "Código no registrado", icon: ShieldX, clase: "bg-destructive text-destructive-foreground" },
  firma_invalida: { titulo: "Código QR no auténtico", icon: ShieldX, clase: "bg-destructive text-destructive-foreground" },
};

export default function Verificar() {
  const { code } = useParams<{ code: string }>();
  const s = new URLSearchParams(useSearch()).get("s") ?? "";
  const [r, setR] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Resultado>(`/api/verificar/${encodeURIComponent(code)}?s=${encodeURIComponent(s)}`)
      .then(setR)
      .catch((e) => setError(e.message));
  }, [code, s]);

  const vista = r ? VISTA[r.estado] : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <img src={logoProveedorRegional} alt="Proveedor Regional" className="h-20 w-20 rounded-lg" />
      <h1 className="mt-4 text-xl font-extrabold">Verificación de tarjeta de membresía</h1>
      <Card className="mt-6 w-full max-w-md overflow-hidden">
        {error && <CardContent className="p-6 text-destructive">{error}</CardContent>}
        {r && vista && (
          <>
            <div className={`flex items-center gap-3 p-5 ${vista.clase}`} role="status">
              <vista.icon className="h-8 w-8 shrink-0" aria-hidden="true" />
              <span className="text-lg font-bold">{vista.titulo}</span>
            </div>
            <CardContent className="space-y-3 p-5 text-sm">
              {r.razonSocial ? (
                <dl className="grid grid-cols-[130px_1fr] gap-y-2">
                  <dt className="text-muted-foreground">Titular</dt>
                  <dd className="font-semibold">{r.razonSocial}</dd>
                  <dt className="text-muted-foreground">RUT</dt>
                  <dd className="font-mono">{r.rut}</dd>
                  <dt className="text-muted-foreground">Código de socio</dt>
                  <dd className="font-mono">{r.memberCode}</dd>
                  <dt className="text-muted-foreground">Tipo</dt>
                  <dd>{r.tipo}</dd>
                  <dt className="text-muted-foreground">Comuna</dt>
                  <dd>{r.comuna}</dd>
                  <dt className="text-muted-foreground">Identidad</dt>
                  <dd>{r.kycVerificado ? "Verificada" : "No verificada"}</dd>
                  <dt className="text-muted-foreground">Pago</dt>
                  <dd>{r.pagoConfirmado ? "Confirmado" : "No confirmado"}</dd>
                  <dt className="text-muted-foreground">Emitida</dt>
                  <dd>{fecha(r.emitidaAt)}</dd>
                  <dt className="text-muted-foreground">Válida hasta</dt>
                  <dd>{fecha(r.validaHasta)}</dd>
                  {r.revocadaAt && (
                    <>
                      <dt className="text-muted-foreground">Revocada</dt>
                      <dd>{fecha(r.revocadaAt)}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="text-muted-foreground">
                  {r.estado === "firma_invalida"
                    ? "El código existe, pero el QR no fue generado por Proveedor Regional. No aceptes esta tarjeta."
                    : "No hay ninguna tarjeta con este código."}
                </p>
              )}
              <p className="pt-2 text-xs text-muted-foreground">
                Consulta en línea del {new Date(r.consultadoAt ?? Date.now()).toLocaleString("es-CL", { timeZone: "America/Santiago" })}. El
                estado se lee directamente del registro de Proveedor Regional.
              </p>
            </CardContent>
          </>
        )}
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">soporte@sicr3p.cl · www.sicr3p.cl</p>
    </div>
  );
}
