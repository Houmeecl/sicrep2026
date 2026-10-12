import { api } from "@/lib/api";

/** El enlace personal (?t=) se guarda solo en esta pestaña para las llamadas siguientes. */
const key = (id: number | string) => `preinscripcion:${id}:t`;

export function rememberToken(id: number | string, token: string | null) {
  if (!token) return;
  try {
    sessionStorage.setItem(key(id), token);
  } catch {
    /* almacenamiento no disponible: la sesión del servidor sigue funcionando */
  }
}

export function tokenFor(id: number | string): string | null {
  try {
    return sessionStorage.getItem(key(id));
  } catch {
    return null;
  }
}

export function apiPre<T = any>(id: number | string, path: string, options: RequestInit = {}): Promise<T> {
  const t = tokenFor(id);
  return api<T>(path, { ...options, headers: { ...(options.headers ?? {}), ...(t ? { "x-access-token": t } : {}) } });
}

export async function uploadDocumento(id: number | string, tipo: string, file: File) {
  const fd = new FormData();
  fd.append("tipo", tipo);
  fd.append("archivo", file);
  const t = tokenFor(id);
  const res = await fetch(`/api/preinscripcion/${id}/documentos`, {
    method: "POST",
    credentials: "include",
    headers: t ? { "x-access-token": t } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? "No se pudo subir el archivo");
  }
  return res.json();
}

export function walletHref(id: number | string, kind: "apple" | "google") {
  const t = tokenFor(id);
  return `/api/preinscripcion/${id}/wallet/${kind}${t ? `?t=${encodeURIComponent(t)}` : ""}`;
}

export const KYC_LABEL: Record<string, string> = {
  borrador: "Pendiente de pago",
  pendiente_revision: "En revisión",
  observado: "Con observaciones",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const PAGO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  pago_no_habilitado: "Pago en línea no habilitado aún",
  en_proceso: "En proceso",
  pagado: "Pagado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

export const DOC_LABEL: Record<string, string> = {
  cedula_frente: "Cédula del representante (frente)",
  cedula_reverso: "Cédula del representante (reverso)",
  inicio_actividades: "Inicio de actividades o carpeta tributaria SII",
  escritura_poderes: "Escritura o certificado de poderes",
};
