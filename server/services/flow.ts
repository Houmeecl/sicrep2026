import crypto from "crypto";

/**
 * Integración real con Flow (flow.cl) para el cobro de la inscripción a la convocatoria
 * regional. No hay credenciales hardcodeadas: se leen de FLOW_API_KEY / FLOW_SECRET_KEY
 * en el entorno. Mientras esas variables no estén configuradas, `isFlowConfigured()`
 * devuelve false y el resto del sistema debe tratar la inscripción como
 * "pago_no_habilitado" — nunca se simula un pago exitoso.
 *
 * FLOW_ENV=sandbox (por defecto) usa https://sandbox.flow.cl/api; FLOW_ENV=production usa
 * https://www.flow.cl/api. Cambiar a producción es una decisión explícita del usuario.
 */

const FLOW_API_KEY = process.env.FLOW_API_KEY;
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY;
const FLOW_BASE_URL =
  process.env.FLOW_ENV === "production" ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

export function isFlowConfigured(): boolean {
  return Boolean(FLOW_API_KEY && FLOW_SECRET_KEY);
}

function sign(params: Record<string, string | number>): string {
  if (!FLOW_SECRET_KEY) throw new Error("FLOW_SECRET_KEY no configurada");
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", FLOW_SECRET_KEY).update(toSign).digest("hex");
}

export interface CreatePaymentInput {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}

export interface CreatePaymentResult {
  url: string;
  token: string;
  flowOrder: string;
  redirectUrl: string;
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  if (!isFlowConfigured()) {
    throw Object.assign(new Error("Flow no está configurado (faltan FLOW_API_KEY/FLOW_SECRET_KEY)"), { status: 503 });
  }

  const params: Record<string, string | number> = {
    apiKey: FLOW_API_KEY!,
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: "CLP",
    amount: Math.round(input.amount),
    email: input.email,
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
  };
  const s = sign(params);

  const body = new URLSearchParams({ ...toStringRecord(params), s });
  const res = await fetch(`${FLOW_BASE_URL}/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data?.message ?? "Error creando el pago en Flow"), { status: 502 });
  }

  return { url: data.url, token: data.token, flowOrder: String(data.flowOrder), redirectUrl: `${data.url}?token=${data.token}` };
}

export interface PaymentStatusResult {
  status: number; // 1 pendiente, 2 pagado, 3 rechazado, 4 anulado
  commerceOrder: string;
  flowOrder: number;
  raw: unknown;
}

export async function getPaymentStatus(token: string): Promise<PaymentStatusResult> {
  if (!isFlowConfigured()) {
    throw Object.assign(new Error("Flow no está configurado (faltan FLOW_API_KEY/FLOW_SECRET_KEY)"), { status: 503 });
  }

  const params: Record<string, string | number> = { apiKey: FLOW_API_KEY!, token };
  const s = sign(params);
  const query = new URLSearchParams({ ...toStringRecord(params), s });

  const res = await fetch(`${FLOW_BASE_URL}/payment/getStatus?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data?.message ?? "Error consultando el estado del pago en Flow"), { status: 502 });
  }
  return { status: data.status, commerceOrder: data.commerceOrder, flowOrder: data.flowOrder, raw: data };
}

function toStringRecord(params: Record<string, string | number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) out[k] = String(v);
  return out;
}
