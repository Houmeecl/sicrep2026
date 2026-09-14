/**
 * Integración real con la API de Nico Seguros (api.nicoseguros.com), pensada para
 * reemplazar la protección paramétrica simulada (antes en parametric.ts) por pólizas
 * reales cuando existan credenciales.
 *
 * ESTADO ACTUAL: preparada pero NO conectada — no hay credenciales configuradas
 * (NICO_SEGUROS_EMAIL / NICO_SEGUROS_PASSWORD). No se afirma haber emitido ninguna
 * póliza real. Mientras isNicoSegurosConfigured() sea false, storage.ts sigue usando el
 * fallback simulado (server/services/parametric.ts) y lo marca explícitamente como tal
 * en la base de datos (insurancePolicies.source = "simulado").
 *
 * Endpoints usados (según swagger.yaml de Nico, doc entregada por el usuario):
 *   POST /api/v1/login                      — autenticación
 *   GET  /api/v1/insurance_companies         — catálogo de compañías
 *   GET  /api/v1/insurance_categories        — catálogo de ramos/categorías
 *   POST /api/v1/insurance_policies          — emitir póliza
 *   GET  /api/v1/policies/:id                — consultar póliza
 */

const BASE_URL = process.env.NICO_SEGUROS_BASE_URL ?? "https://api.nicoseguros.com";
const EMAIL = process.env.NICO_SEGUROS_EMAIL;
const PASSWORD = process.env.NICO_SEGUROS_PASSWORD;

export function isNicoSegurosConfigured(): boolean {
  return Boolean(EMAIL && PASSWORD);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function login(): Promise<string> {
  if (!isNicoSegurosConfigured()) {
    throw Object.assign(new Error("Nico Seguros no está configurado (faltan NICO_SEGUROS_EMAIL/NICO_SEGUROS_PASSWORD)"), {
      status: 503,
    });
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/api/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Nico Seguros: login falló (HTTP ${res.status})`), { status: 502 });
  }
  const data = await res.json();
  const token = data.token ?? data.access_token;
  if (!token) throw Object.assign(new Error("Nico Seguros: respuesta de login sin token"), { status: 502 });

  // Cache conservador de 25 min; ajustar si la API documenta un TTL distinto.
  cachedToken = { token, expiresAt: Date.now() + 25 * 60 * 1000 };
  return token;
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const token = await login();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Nico Seguros: error HTTP ${res.status} en ${path} — ${body}`), { status: 502 });
  }
  return res.json();
}

export interface CreatePolicyInput {
  providerRut: string;
  providerCompanyName: string;
  insuranceCategoryId: string | number;
  insuranceCompanyId: string | number;
}

export interface NicoPolicy {
  id: string;
  status: string;
  coverageType?: string;
  raw: unknown;
}

export async function createInsurancePolicy(input: CreatePolicyInput): Promise<NicoPolicy> {
  const data = await authedFetch("/api/v1/insurance_policies", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { id: String(data.id), status: data.status, coverageType: data.coverage_type, raw: data };
}

export async function getInsurancePolicy(id: string): Promise<NicoPolicy> {
  const data = await authedFetch(`/api/v1/policies/${id}`);
  return { id: String(data.id), status: data.status, coverageType: data.coverage_type, raw: data };
}

export async function listInsuranceCompanies() {
  return authedFetch("/api/v1/insurance_companies");
}

export async function listInsuranceCategories() {
  return authedFetch("/api/v1/insurance_categories");
}
