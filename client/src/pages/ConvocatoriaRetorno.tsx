import { useEffect, useState } from "react";
import { useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, Award, Plane } from "lucide-react";

interface InscripcionStatus {
  companyName: string;
  paymentStatus: string;
  founderStatus: string;
  brasilTripSelected: boolean;
}

const STATUS_INFO: Record<string, { label: string; icon: typeof CheckCircle2; variant: "success" | "default" | "accent" }> = {
  pagado: { label: "Pago confirmado", icon: CheckCircle2, variant: "success" },
  rechazado: { label: "Pago rechazado", icon: XCircle, variant: "default" },
  anulado: { label: "Pago anulado", icon: XCircle, variant: "default" },
  en_proceso: { label: "Pago en proceso", icon: Clock, variant: "accent" },
  pendiente: { label: "Pago pendiente", icon: Clock, variant: "accent" },
  pago_no_habilitado: { label: "Pago no habilitado", icon: Clock, variant: "accent" },
};

const FOUNDER_STATUS_LABEL: Record<string, string> = {
  pendiente_revision: "En revisión (tributaria/laboral)",
  confirmado: "Confirmado",
  rechazado: "No confirmado",
};

export default function ConvocatoriaRetorno() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  const [data, setData] = useState<InscripcionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Falta el token de la transacción.");
      return;
    }
    api<InscripcionStatus>(`/api/convocatoria/inscripciones/by-token/${token}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  const info = data ? STATUS_INFO[data.paymentStatus] ?? STATUS_INFO.pendiente : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Estado de tu inscripción</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive">{error}</p>}
          {data && info && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <info.icon className="h-12 w-12 text-primary" />
                <p className="font-semibold">{data.companyName}</p>
                <Badge variant={info.variant}>{info.label}</Badge>
              </div>

              {data.paymentStatus === "pagado" && (
                <div className="w-full space-y-2 rounded-xl border border-border bg-muted/50 p-4 text-left text-sm">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-violet" />
                    <span>
                      Socio fundador: <strong>{FOUNDER_STATUS_LABEL[data.founderStatus] ?? data.founderStatus}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-violet" />
                    <span>
                      Viaje a Brasil:{" "}
                      <strong>{data.brasilTripSelected ? "¡Seleccionada en el sorteo!" : "Pendiente del sorteo"}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <Link href="/convocatoria" className="mt-6 inline-block font-semibold text-primary underline">
            Volver a la convocatoria
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
