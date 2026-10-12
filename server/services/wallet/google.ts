import crypto from "crypto";
import type { Preinscripcion } from "@shared/schema";
import { formatRut } from "@shared/rut";
import { readPem } from "./assets";
import { appBaseUrl, verificationUrl } from "../memberCard";

/**
 * Pase de Google Wallet (Generic pass) mediante enlace "Guardar en Google Wallet" firmado (JWT RS256).
 *
 * Variables necesarias (pay.google.com/business/console → Google Wallet API):
 *   GOOGLE_WALLET_ISSUER_ID         ID de emisor
 *   GOOGLE_WALLET_SA_EMAIL          correo de la cuenta de servicio con rol en el emisor
 *   GOOGLE_WALLET_SA_PRIVATE_KEY    clave privada de esa cuenta de servicio (PEM en línea o ruta)
 *
 * Sin ellas el botón de Google Wallet no se ofrece. Al revocar una tarjeta se intenta además
 * marcar el pase como INACTIVE en Google; el QR de todas formas deja de validar al instante.
 */

export function isGoogleWalletConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SA_EMAIL && process.env.GOOGLE_WALLET_SA_PRIVATE_KEY
  );
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signJwt(payload: Record<string, unknown>): string {
  const key = readPem(process.env.GOOGLE_WALLET_SA_PRIVATE_KEY);
  if (!key) throw Object.assign(new Error("Falta GOOGLE_WALLET_SA_PRIVATE_KEY"), { status: 503 });
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${body}`), key);
  return `${header}.${body}.${b64url(signature)}`;
}

const issuerId = () => process.env.GOOGLE_WALLET_ISSUER_ID!;
export const googleClassId = () => `${issuerId()}.proveedor_regional_membresia_preinscripcion`;
export const googleObjectId = (serial: string) => `${issuerId()}.${serial.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" }).format(d);

export function buildGoogleSaveUrl(p: Preinscripcion): string {
  if (!isGoogleWalletConfigured()) {
    throw Object.assign(new Error("Google Wallet no está configurado en el servidor"), { status: 503 });
  }
  if (p.cardStatus !== "vigente" || !p.memberCode || !p.cardSerial || !p.cardValidaHasta) {
    throw Object.assign(new Error("La tarjeta aún no está emitida"), { status: 409 });
  }
  const base = appBaseUrl();
  const t = (value: string) => ({ defaultValue: { language: "es-419", value } });

  const genericObject = {
    id: googleObjectId(p.cardSerial),
    classId: googleClassId(),
    state: "ACTIVE",
    cardTitle: t("Proveedor Regional"),
    header: t(p.razonSocial),
    subheader: t("Membresía · Preinscripción"),
    hexBackgroundColor: "#1e2876",
    logo: { sourceUri: { uri: `${base}/wallet-assets/google-logo.png` }, contentDescription: t("Proveedor Regional") },
    barcode: { type: "QR_CODE", value: verificationUrl(p.memberCode), alternateText: p.memberCode },
    validTimeInterval: { end: { date: p.cardValidaHasta.toISOString() } },
    textModulesData: [
      { id: "socio", header: "Código de socio", body: p.memberCode },
      { id: "rut", header: "RUT", body: formatRut(p.rut) },
      { id: "vigencia", header: "Válida hasta", body: fmtDate(p.cardValidaHasta) },
      { id: "comuna", header: "Comuna", body: p.comuna },
      { id: "folio", header: "Folio", body: p.folio },
    ],
    linksModuleData: {
      uris: [
        { uri: verificationUrl(p.memberCode), description: "Verificar validez", id: "verificar" },
        { uri: "https://www.sicr3p.cl", description: "www.sicr3p.cl", id: "web" },
        { uri: "mailto:soporte@sicr3p.cl", description: "soporte@sicr3p.cl", id: "soporte" },
      ],
    },
  };

  const jwt = signJwt({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [base],
    payload: {
      genericClasses: [{ id: googleClassId() }],
      genericObjects: [genericObject],
    },
  });
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: process.env.GOOGLE_WALLET_SA_EMAIL,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? "No se obtuvo token de Google");
  return data.access_token;
}

/** Marca el pase como inactivo en Google Wallet. Devuelve false si no aplica o falla (no bloquea la revocación). */
export async function deactivateGooglePass(serial: string): Promise<boolean> {
  if (!isGoogleWalletConfigured()) return false;
  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${encodeURIComponent(googleObjectId(serial))}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ state: "INACTIVE" }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
