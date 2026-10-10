import crypto from "crypto";
import QRCode from "qrcode";

/**
 * Identidad de la tarjeta de membresía: código de socio, firma y URL de verificación.
 *
 * El QR de la tarjeta (en pantalla y en Apple/Google Wallet) apunta a
 * {APP_BASE_URL}/verificar/{codigo}?s={firma}. La firma es un HMAC con CARD_SIGNING_SECRET:
 * una tarjeta inventada o editada no pasa la verificación aunque copie el diseño.
 * Además la página de verificación consulta el estado VIVO en la base (vigente, revocada,
 * vencida), así que revocar una tarjeta la invalida al instante en todos los wallets.
 */

export const PREINSCRIPCION_FEE_CLP = 20000;

export function vigenciaMeses(): number {
  const n = Number(process.env.PREINSCRIPCION_VIGENCIA_MESES ?? 12);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

function signingSecret(): string {
  const s = process.env.CARD_SIGNING_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw Object.assign(new Error("CARD_SIGNING_SECRET no configurado (mínimo 32 caracteres)"), { status: 503 });
  }
  return "dev-only-card-signing-secret-no-usar-en-produccion";
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sin 0/O/1/I/L para evitar confusiones

export function newMemberCode(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const bytes = crypto.randomBytes(8);
  let body = "";
  for (let i = 0; i < 8; i++) body += ALPHABET[bytes[i] % ALPHABET.length];
  return `PR${yy}-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function newCardSerial(): string {
  return crypto.randomUUID();
}

export function signMemberCode(code: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(`member:${code}`).digest("base64url").slice(0, 16);
}

export function isValidSignature(code: string, sig: string | undefined | null): boolean {
  if (!sig) return false;
  const expected = Buffer.from(signMemberCode(code));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? 5000}`).replace(/\/$/, "");
}

export function verificationUrl(code: string): string {
  return `${appBaseUrl()}/verificar/${encodeURIComponent(code)}?s=${signMemberCode(code)}`;
}

export async function verificationQrSvg(code: string): Promise<string> {
  return QRCode.toString(verificationUrl(code), { type: "svg", errorCorrectionLevel: "M", margin: 1 });
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export type CardEffectiveState = "no_emitida" | "vigente" | "vencida" | "revocada";

export function effectiveCardState(p: {
  cardStatus: "no_emitida" | "vigente" | "revocada";
  cardValidaHasta: Date | null;
}, now = new Date()): CardEffectiveState {
  if (p.cardStatus === "revocada") return "revocada";
  if (p.cardStatus === "no_emitida") return "no_emitida";
  if (p.cardValidaHasta && p.cardValidaHasta.getTime() < now.getTime()) return "vencida";
  return "vigente";
}
