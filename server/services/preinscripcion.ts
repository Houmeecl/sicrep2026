import crypto from "crypto";
import { db } from "../db";
import {
  preinscripciones,
  preinscripcionDocumentos,
  preinscripcionEventos,
  preinscripcionPagos,
  type InsertPreinscripcion,
  type KycReviewInput,
  type Preinscripcion,
  type PreinscripcionDocumento,
  type DocumentoTipo,
  PREINSCRIPCION_TERMINOS_VERSION,
} from "@shared/schema";
import { isValidRut, normalizeRut, isCompanyRut, formatRut, maskRut } from "@shared/rut";
import fs from "fs";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { createPayment, getPaymentStatus, isFlowConfigured } from "./flow";
import { sendMail } from "./mailer";
import { saveDocument, resolveStoredPath } from "./documentStore";
import {
  PREINSCRIPCION_FEE_CLP,
  addMonths,
  appBaseUrl,
  effectiveCardState,
  isValidSignature,
  newCardSerial,
  newMemberCode,
  verificationQrSvg,
  verificationUrl,
  vigenciaMeses,
} from "./memberCard";
import { isAppleWalletConfigured } from "./wallet/apple";
import { deactivateGooglePass, isGoogleWalletConfigured } from "./wallet/google";

/**
 * Preinscripción Proveedor Regional: KYC + pago de $20.000 (Flow) + tarjeta de membresía en wallet.
 *
 * Qué se verifica y cómo (sin exagerar lo que el sistema hace):
 *  AUTOMÁTICO
 *   - RUT de la empresa, del representante y de beneficiarios finales: dígito verificador (módulo 11).
 *   - Coherencia tipo de contribuyente ↔ RUT (persona jurídica ≥ 50.000.000).
 *   - Correo: código de 6 dígitos enviado por correo (hash HMAC, 10 min, máx. 5 intentos).
 *   - Documentos: tipo real del archivo (firma binaria PDF/JPG/PNG), tamaño, hash SHA-256.
 *   - Un RUT solo puede tener una preinscripción activa.
 *   - Pago: estado consultado directamente a Flow con la API firmada; nunca se confía en el navegador.
 *  MANUAL (administrador)
 *   - Que la cédula corresponda al representante y esté vigente.
 *   - Que la empresa exista y tenga inicio de actividades ante el SII (documento adjunto).
 *   - Poderes del representante (persona jurídica) y declaración PEP / beneficiarios finales.
 *  La tarjeta se emite solo con pago confirmado + KYC aprobado.
 */

export const DOCUMENTOS_OBLIGATORIOS: Record<"persona_juridica" | "persona_natural", DocumentoTipo[]> = {
  persona_juridica: ["cedula_frente", "cedula_reverso", "inicio_actividades", "escritura_poderes"],
  persona_natural: ["cedula_frente", "cedula_reverso", "inicio_actividades"],
};

export const DOCUMENTO_LABEL: Record<DocumentoTipo, string> = {
  cedula_frente: "Cédula de identidad del representante (frente)",
  cedula_reverso: "Cédula de identidad del representante (reverso)",
  inicio_actividades: "Inicio de actividades o carpeta tributaria SII",
  escritura_poderes: "Escritura o certificado de poderes del representante",
};

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_INTENTOS = 5;
const MAX_VERSIONES_POR_TIPO = 3;

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function otpSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw httpError(503, "SESSION_SECRET no configurado");
  return s ?? "proveedor-regional-dev-secret";
}

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const hashOtp = (id: number, code: string) => crypto.createHmac("sha256", otpSecret()).update(`${id}:${code}`).digest("hex");

export function hashAccessToken(token: string): string {
  return sha256(`access:${token}`);
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function checkAccessToken(p: Preinscripcion, token: string | undefined | null): boolean {
  if (!token) return false;
  return safeEqualHex(p.accessTokenHash, hashAccessToken(token));
}

async function logEvento(preinscripcionId: number, tipo: string, detalle = "", extra: { actorUserId?: number; ip?: string } = {}) {
  await db.insert(preinscripcionEventos).values({ preinscripcionId, tipo, detalle, actorUserId: extra.actorUserId, ip: extra.ip });
}

export async function getById(id: number): Promise<Preinscripcion | undefined> {
  const [p] = await db.select().from(preinscripciones).where(eq(preinscripciones.id, id));
  return p;
}

async function update(id: number, values: Partial<typeof preinscripciones.$inferInsert>): Promise<Preinscripcion> {
  const [p] = await db
    .update(preinscripciones)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(preinscripciones.id, id))
    .returning();
  return p;
}

export async function listDocumentos(id: number): Promise<PreinscripcionDocumento[]> {
  return db
    .select()
    .from(preinscripcionDocumentos)
    .where(eq(preinscripcionDocumentos.preinscripcionId, id))
    .orderBy(desc(preinscripcionDocumentos.createdAt));
}

function statusLink(id: number, accessToken: string) {
  return `${appBaseUrl()}/preinscripcion/estado?id=${id}&t=${encodeURIComponent(accessToken)}`;
}

// --- Creación ---

export async function crear(input: InsertPreinscripcion, meta: { ip: string; userAgent: string }) {
  const rut = normalizeRut(input.rut);
  const repRut = normalizeRut(input.repRut);

  if (!isValidRut(rut)) throw httpError(400, "El RUT del contribuyente no es válido");
  if (!isValidRut(repRut)) throw httpError(400, "El RUT del representante no es válido");
  if (input.tipoContribuyente === "persona_juridica" && !isCompanyRut(rut)) {
    throw httpError(400, "Ese RUT corresponde a una persona natural: elige “Persona natural con giro”");
  }
  if (input.tipoContribuyente === "persona_natural") {
    if (isCompanyRut(rut)) throw httpError(400, "Ese RUT corresponde a una persona jurídica");
    if (rut !== repRut) throw httpError(400, "En persona natural, el titular debe ser la misma persona del RUT");
  }
  if (input.esPep && input.pepDetalle.trim().length < 5) {
    throw httpError(400, "Indica el cargo o vínculo que te hace Persona Expuesta Políticamente");
  }

  const beneficiarios = input.beneficiariosFinales.map((b) => ({ ...b, rut: normalizeRut(b.rut) }));
  for (const b of beneficiarios) {
    if (!isValidRut(b.rut)) throw httpError(400, `RUT inválido para el beneficiario ${b.nombre}`);
  }
  if (input.tipoContribuyente === "persona_juridica" && beneficiarios.length === 0) {
    throw httpError(400, "Declara al menos un beneficiario final (persona natural con 10% o más de participación)");
  }
  if (beneficiarios.reduce((s, b) => s + b.porcentaje, 0) > 100) {
    throw httpError(400, "La suma de participaciones de los beneficiarios finales supera 100%");
  }

  const [existente] = await db
    .select({ id: preinscripciones.id })
    .from(preinscripciones)
    .where(and(eq(preinscripciones.rut, rut), ne(preinscripciones.kycStatus, "rechazado")));
  if (existente) {
    throw httpError(409, "Ya existe una preinscripción activa para este RUT. Revisa tu correo para retomarla.");
  }

  const accessToken = crypto.randomBytes(32).toString("base64url");
  const tempFolio = `TMP-${crypto.randomBytes(8).toString("hex")}`;

  let p: Preinscripcion;
  try {
    [p] = await db
      .insert(preinscripciones)
      .values({
        folio: tempFolio,
        tipoContribuyente: input.tipoContribuyente,
        razonSocial: input.razonSocial,
        rut,
        giro: input.giro,
        comuna: input.comuna,
        direccion: input.direccion,
        repNombre: input.repNombre,
        repRut,
        repCargo: input.repCargo,
        email: input.email,
        telefono: input.telefono.replace(/\s/g, ""),
        esPep: input.esPep,
        pepDetalle: input.esPep ? input.pepDetalle : "",
        beneficiariosFinales: JSON.stringify(beneficiarios),
        declaraVeracidad: true,
        aceptaTerminosVersion: PREINSCRIPCION_TERMINOS_VERSION,
        consentimientoDatosAt: new Date(),
        consentimientoIp: meta.ip,
        consentimientoUserAgent: meta.userAgent.slice(0, 500),
        accessTokenHash: hashAccessToken(accessToken),
        amount: String(PREINSCRIPCION_FEE_CLP),
      })
      .returning();
  } catch (err: any) {
    if (err?.code === "23505") throw httpError(409, "Ya existe una preinscripción activa para este RUT");
    throw err;
  }

  const folio = `PRE-${new Date().getFullYear()}-${String(p.id).padStart(6, "0")}`;
  p = await update(p.id, { folio });
  await logEvento(p.id, "creada", `Términos ${PREINSCRIPCION_TERMINOS_VERSION} y tratamiento de datos aceptados`, { ip: meta.ip });
  // Si el correo falla, la preinscripción queda creada y el postulante puede pedir reenvío.
  const otpEnviado = await enviarOtp(p, accessToken).then(
    () => true,
    (e) => {
      console.error("[preinscripción] código no enviado:", e.message);
      return false;
    }
  );

  return { preinscripcion: p, accessToken, otpEnviado };
}

// --- Verificación de correo ---

async function enviarOtp(p: Preinscripcion, accessToken?: string) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await update(p.id, {
    emailOtpHash: hashOtp(p.id, code),
    emailOtpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
    emailOtpIntentos: 0,
  });
  const link = accessToken ? `\n\nPara retomar tu preinscripción en cualquier momento usa este enlace personal (no lo compartas):\n${statusLink(p.id, accessToken)}` : "";
  await sendMail({
    to: p.email,
    subject: `Tu código de verificación: ${code} — Proveedor Regional`,
    text: `Hola ${p.repNombre},\n\nTu código para verificar el correo de la preinscripción ${p.folio} (${p.razonSocial}) es:\n\n${code}\n\nVence en 10 minutos. Si no iniciaste esta preinscripción, ignora este mensaje.${link}\n\nProveedor Regional · soporte@sicr3p.cl · www.sicr3p.cl`,
  });
  await logEvento(p.id, "otp_enviado", p.email);
}

export async function reenviarOtp(id: number) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (p.emailVerificadoAt) throw httpError(409, "El correo ya está verificado");
  if (p.emailOtpExpiresAt) {
    const enviadoAt = p.emailOtpExpiresAt.getTime() - OTP_TTL_MS;
    if (Date.now() - enviadoAt < OTP_RESEND_MS) throw httpError(429, "Espera un minuto antes de pedir otro código");
  }
  // Se renueva el enlace personal y viaja en el mismo correo: si el primer envío falló, el
  // postulante igual recibe una forma de retomar desde otro dispositivo.
  const accessToken = crypto.randomBytes(32).toString("base64url");
  await update(p.id, { accessTokenHash: hashAccessToken(accessToken) });
  await logEvento(p.id, "enlace_renovado");
  await enviarOtp(p, accessToken);
  return { accessToken };
}

export async function verificarOtp(id: number, codigo: string, ip: string) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (p.emailVerificadoAt) return p;
  if (!p.emailOtpHash || !p.emailOtpExpiresAt || p.emailOtpExpiresAt.getTime() < Date.now()) {
    throw httpError(410, "El código venció. Pide uno nuevo.");
  }
  if (p.emailOtpIntentos >= OTP_MAX_INTENTOS) throw httpError(429, "Demasiados intentos. Pide un código nuevo.");

  if (!safeEqualHex(p.emailOtpHash, hashOtp(p.id, codigo))) {
    await update(p.id, { emailOtpIntentos: p.emailOtpIntentos + 1 });
    await logEvento(p.id, "otp_fallido", "", { ip });
    throw httpError(400, "Código incorrecto");
  }
  const updated = await update(p.id, { emailVerificadoAt: new Date(), emailOtpHash: null, emailOtpExpiresAt: null });
  await logEvento(p.id, "correo_verificado", p.email, { ip });
  return updated;
}

// --- Documentos ---

export async function agregarDocumento(id: number, tipo: DocumentoTipo, file: { buffer: Buffer; originalname: string }, ip: string) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (!["borrador", "observado"].includes(p.kycStatus)) {
    throw httpError(409, "Los documentos ya están en revisión; no se pueden modificar ahora");
  }
  if (!p.emailVerificadoAt) throw httpError(400, "Primero verifica tu correo");

  const previos = (await listDocumentos(id)).filter((d) => d.tipo === tipo);
  if (p.kycStatus === "borrador") {
    // Aún nadie los revisó: reemplazar elimina la versión anterior (el disco ocupado queda acotado).
    for (const d of previos) {
      await fs.promises.unlink(resolveStoredPath(d.storagePath)).catch(() => undefined);
      await db.delete(preinscripcionDocumentos).where(eq(preinscripcionDocumentos.id, d.id));
    }
  } else if (previos.length >= MAX_VERSIONES_POR_TIPO) {
    // En observación se conserva lo que el revisor ya vio, con un tope de versiones por tipo.
    throw httpError(429, "Alcanzaste el máximo de versiones para este documento. Escríbenos a soporte@sicr3p.cl");
  }

  const saved = await saveDocument(id, file.buffer);
  const [doc] = await db
    .insert(preinscripcionDocumentos)
    .values({ preinscripcionId: id, tipo, nombreOriginal: file.originalname.slice(0, 255), ...saved })
    .returning();
  await logEvento(id, "documento_subido", `${tipo} · sha256 ${saved.sha256}`, { ip });
  return doc;
}

function documentosFaltantes(p: Preinscripcion, docs: PreinscripcionDocumento[]): DocumentoTipo[] {
  const req = DOCUMENTOS_OBLIGATORIOS[p.tipoContribuyente as "persona_juridica" | "persona_natural"] ?? [];
  return req.filter((t) => !docs.some((d) => d.tipo === t));
}

/** Tras una observación del revisor, el postulante corrige y vuelve a enviar a revisión. */
export async function reenviarARevision(id: number, ip: string) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (p.kycStatus !== "observado") throw httpError(409, "La preinscripción no tiene observaciones pendientes");
  const faltan = documentosFaltantes(p, await listDocumentos(id));
  if (faltan.length) throw httpError(400, `Faltan documentos: ${faltan.map((t) => DOCUMENTO_LABEL[t]).join(", ")}`);
  const updated = await update(id, { kycStatus: "pendiente_revision" });
  await logEvento(id, "reenviada_a_revision", "", { ip });
  return updated;
}

// --- Pago ---

export async function iniciarPago(id: number, urls: { urlConfirmation: string; urlReturn: string }, ip: string) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (p.paymentStatus === "pagado") throw httpError(409, "Esta preinscripción ya está pagada");
  if (p.kycStatus === "rechazado") throw httpError(409, "La preinscripción fue rechazada");
  if (!p.emailVerificadoAt) throw httpError(400, "Primero verifica tu correo");
  const faltan = documentosFaltantes(p, await listDocumentos(id));
  if (faltan.length) throw httpError(400, `Faltan documentos: ${faltan.map((t) => DOCUMENTO_LABEL[t]).join(", ")}`);

  if (!isFlowConfigured()) {
    await update(id, { paymentStatus: "pago_no_habilitado" });
    await logEvento(id, "pago_no_habilitado", "Flow sin credenciales: no se cobró nada", { ip });
    throw httpError(503, "El pago en línea aún no está habilitado. Te avisaremos por correo cuando puedas pagar.");
  }

  // Si hay una orden abierta, primero se consulta a Flow: puede haberse pagado ya.
  if (p.paymentStatus === "en_proceso" && p.flowToken) {
    const actual = await confirmarPagoPorToken(p.flowToken);
    if (actual.paymentStatus === "pagado") throw httpError(409, "Esta preinscripción ya está pagada");
  }

  const commerceOrder = `pr-pre-${p.id}-${Date.now()}`;
  const payment = await createPayment({
    commerceOrder,
    subject: `Preinscripción Proveedor Regional ${p.folio}`,
    amount: PREINSCRIPCION_FEE_CLP,
    email: p.email,
    urlConfirmation: urls.urlConfirmation,
    urlReturn: urls.urlReturn,
  });
  await db.insert(preinscripcionPagos).values({
    preinscripcionId: id,
    commerceOrder,
    flowToken: payment.token,
    flowOrder: payment.flowOrder,
  });
  await update(id, {
    paymentStatus: "en_proceso",
    flowCommerceOrder: commerceOrder,
    flowToken: payment.token,
    flowFlowOrder: payment.flowOrder,
  });
  await logEvento(id, "pago_iniciado", `Flow orden ${payment.flowOrder} · ${commerceOrder}`, { ip });
  return { redirectUrl: payment.redirectUrl };
}

const FLOW_MAP: Record<number, "en_proceso" | "pagado" | "rechazado" | "anulado"> = {
  1: "en_proceso",
  2: "pagado",
  3: "rechazado",
  4: "anulado",
};

/**
 * Llamado por el webhook de Flow y por el retorno del usuario: siempre consulta a Flow.
 * Reconoce cualquier intento de pago de la preinscripción, no solo el último.
 */
export async function confirmarPagoPorToken(token: string): Promise<Preinscripcion> {
  const [intento] = await db.select().from(preinscripcionPagos).where(eq(preinscripcionPagos.flowToken, token));
  if (!intento) throw httpError(404, "Pago no encontrado");
  const p = (await getById(intento.preinscripcionId))!;
  if (intento.status === "pagado") return p;

  const status = await getPaymentStatus(token);
  const raw = status.raw as { amount?: number | string; commerceOrder?: string };
  const estado = FLOW_MAP[status.status] ?? "en_proceso";

  if (estado === "pagado") {
    // Defensa adicional: el pago confirmado debe ser de esta orden y por el monto exacto.
    if (String(raw.commerceOrder) !== intento.commerceOrder || Math.round(Number(raw.amount)) !== PREINSCRIPCION_FEE_CLP) {
      await logEvento(p.id, "pago_inconsistente", JSON.stringify(status.raw));
      throw httpError(409, "El pago informado por Flow no coincide con la orden");
    }
  }

  await db
    .update(preinscripcionPagos)
    .set({ status: estado, rawStatus: JSON.stringify(status.raw), updatedAt: new Date() })
    .where(eq(preinscripcionPagos.id, intento.id));
  await logEvento(p.id, `pago_${estado}`, `Flow orden ${status.flowOrder} · ${intento.commerceOrder}`);

  if (estado !== "pagado") {
    // Solo el intento vigente define el estado visible; uno antiguo rechazado no lo pisa.
    if (p.flowToken === token && p.paymentStatus !== "pagado") {
      return update(p.id, { paymentStatus: estado, flowRawStatus: JSON.stringify(status.raw) });
    }
    return p;
  }

  // Pago confirmado: se acredita una sola vez (actualización condicional).
  const [acreditada] = await db
    .update(preinscripciones)
    .set({
      paymentStatus: "pagado",
      flowToken: token,
      flowCommerceOrder: intento.commerceOrder,
      flowFlowOrder: String(status.flowOrder),
      flowRawStatus: JSON.stringify(status.raw),
      paidAt: new Date(),
      kycStatus: p.kycStatus === "borrador" ? "pendiente_revision" : p.kycStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(preinscripciones.id, p.id), ne(preinscripciones.paymentStatus, "pagado")))
    .returning();

  if (!acreditada) {
    // Ya estaba pagada por otra orden: este segundo cobro debe devolverse.
    await logEvento(p.id, "pago_duplicado", `Orden ${intento.commerceOrder} pagada además de la acreditada: requiere devolución`);
    return (await getById(p.id))!;
  }

  await sendMail({
    to: acreditada.email,
    subject: `Pago recibido — preinscripción ${acreditada.folio}`,
    text: `Hola ${acreditada.repNombre},\n\nRecibimos el pago de $20.000 de la preinscripción ${acreditada.folio} (${acreditada.razonSocial}).\n\nAhora revisamos tus antecedentes. Cuando la verificación esté aprobada te enviaremos tu tarjeta de membresía para Apple Wallet y Google Wallet.\n\nProveedor Regional · soporte@sicr3p.cl`,
  }).catch((e) => console.error("[preinscripción] correo de pago no enviado:", e.message));
  return intentarEmitirTarjeta(acreditada);
}

// --- Revisión KYC (admin) ---

export async function revisarKyc(id: number, input: KycReviewInput, adminUserId: number, ip: string) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (!["pendiente_revision", "observado"].includes(p.kycStatus)) {
    throw httpError(409, "Solo se revisan preinscripciones pagadas y en revisión");
  }
  if (input.decision !== "aprobado" && input.nota.length < 5) {
    throw httpError(400, "Explica al postulante qué debe corregir o por qué se rechaza");
  }
  // Condicional: si dos revisores deciden a la vez, solo una decisión se aplica.
  let [updated] = await db
    .update(preinscripciones)
    .set({ kycStatus: input.decision, kycNota: input.nota, kycRevisadoPor: adminUserId, kycRevisadoAt: new Date(), updatedAt: new Date() })
    .where(and(eq(preinscripciones.id, id), inArray(preinscripciones.kycStatus, ["pendiente_revision", "observado"])))
    .returning();
  if (!updated) throw httpError(409, "Otra persona ya resolvió esta preinscripción; recarga para ver su estado");
  await logEvento(id, `kyc_${input.decision}`, input.nota, { actorUserId: adminUserId, ip });

  if (input.decision === "aprobado") {
    updated = await intentarEmitirTarjeta(updated);
  } else {
    const msg =
      input.decision === "observado"
        ? `Tu preinscripción ${p.folio} tiene una observación que debes corregir:\n\n${input.nota}\n\nIngresa con tu enlace personal, corrige y vuelve a enviar a revisión.`
        : `Tu preinscripción ${p.folio} no fue aprobada:\n\n${input.nota}\n\nSi corresponde la devolución del pago, te contactaremos para gestionarla.`;
    await sendMail({ to: p.email, subject: `Preinscripción ${p.folio}: ${input.decision}`, text: `Hola ${p.repNombre},\n\n${msg}\n\nProveedor Regional · soporte@sicr3p.cl` }).catch(
      (e) => console.error("[preinscripción] correo de revisión no enviado:", e.message)
    );
  }
  return updated;
}

// --- Emisión y revocación de la tarjeta ---

async function intentarEmitirTarjeta(p: Preinscripcion): Promise<Preinscripcion> {
  if (p.paymentStatus !== "pagado" || p.kycStatus !== "aprobado" || p.cardStatus !== "no_emitida") return p;

  for (let intento = 0; intento < 5; intento++) {
    const memberCode = newMemberCode();
    const ahora = new Date();
    try {
      // Se reclama la emisión con una actualización condicional: nunca se emiten dos códigos.
      const [updated] = await db
        .update(preinscripciones)
        .set({
          cardStatus: "vigente",
          memberCode,
          cardSerial: newCardSerial(),
          cardEmitidaAt: ahora,
          cardValidaHasta: addMonths(ahora, vigenciaMeses()),
          updatedAt: ahora,
        })
        .where(
          and(
            eq(preinscripciones.id, p.id),
            eq(preinscripciones.cardStatus, "no_emitida"),
            eq(preinscripciones.paymentStatus, "pagado"),
            eq(preinscripciones.kycStatus, "aprobado")
          )
        )
        .returning();
      if (!updated) return (await getById(p.id))!;
      await logEvento(p.id, "tarjeta_emitida", memberCode);
      await sendMail({
        to: updated.email,
        subject: `Tu tarjeta de membresía Proveedor Regional — ${memberCode}`,
        text: `Hola ${updated.repNombre},\n\nTu preinscripción ${updated.folio} fue aprobada y tu tarjeta de membresía ya está emitida.\n\nCódigo de socio: ${memberCode}\nVálida hasta: ${updated.cardValidaHasta!.toLocaleDateString("es-CL")}\n\nAgrégala a Apple Wallet o Google Wallet desde tu enlace personal (el que recibiste al inscribirte).\nCualquier persona puede comprobar su validez en:\n${verificationUrl(memberCode)}\n\nProveedor Regional · soporte@sicr3p.cl · www.sicr3p.cl`,
      }).catch((e) => console.error("[preinscripción] correo de tarjeta no enviado:", e.message));
      return updated;
    } catch (err: any) {
      if (err?.code !== "23505") throw err; // colisión de código: se reintenta con otro
    }
  }
  throw httpError(500, "No se pudo generar un código de socio único");
}

export async function revocarTarjeta(id: number, motivo: string, adminUserId: number, ip: string) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  if (p.cardStatus !== "vigente") throw httpError(409, "La tarjeta no está vigente");
  const updated = await update(id, { cardStatus: "revocada", cardRevocadaAt: new Date(), cardRevocacionMotivo: motivo });
  const google = p.cardSerial ? await deactivateGooglePass(p.cardSerial) : false;
  await logEvento(id, "tarjeta_revocada", `${motivo}${google ? " · pase Google desactivado" : ""}`, { actorUserId: adminUserId, ip });
  return updated;
}

// --- Vistas ---

export async function vistaPostulante(p: Preinscripcion) {
  const docs = await listDocumentos(p.id);
  const estadoTarjeta = effectiveCardState(p);
  return {
    id: p.id,
    folio: p.folio,
    tipoContribuyente: p.tipoContribuyente,
    razonSocial: p.razonSocial,
    rut: formatRut(p.rut),
    comuna: p.comuna,
    repNombre: p.repNombre,
    email: p.email,
    emailVerificado: Boolean(p.emailVerificadoAt),
    monto: PREINSCRIPCION_FEE_CLP,
    paymentStatus: p.paymentStatus,
    pagoHabilitado: isFlowConfigured(),
    kycStatus: p.kycStatus,
    kycNota: p.kycStatus === "observado" || p.kycStatus === "rechazado" ? p.kycNota : "",
    documentos: docs.map((d) => ({ id: d.id, tipo: d.tipo, nombre: d.nombreOriginal, bytes: d.bytes, subidoAt: d.createdAt })),
    documentosObligatorios: DOCUMENTOS_OBLIGATORIOS[p.tipoContribuyente as "persona_juridica" | "persona_natural"],
    documentosFaltantes: documentosFaltantes(p, docs),
    tarjeta:
      estadoTarjeta === "no_emitida"
        ? { estado: estadoTarjeta }
        : {
            estado: estadoTarjeta,
            memberCode: p.memberCode,
            emitidaAt: p.cardEmitidaAt,
            validaHasta: p.cardValidaHasta,
            verificacionUrl: verificationUrl(p.memberCode!),
            qrSvg: await verificationQrSvg(p.memberCode!),
            appleWallet: estadoTarjeta === "vigente" && isAppleWalletConfigured(),
            googleWallet: estadoTarjeta === "vigente" && isGoogleWalletConfigured(),
          },
  };
}

export async function verificarPublico(code: string, sig: string | undefined) {
  const [p] = await db.select().from(preinscripciones).where(eq(preinscripciones.memberCode, code));
  if (!p) return { estado: "no_encontrada" as const };
  if (!isValidSignature(code, sig)) return { estado: "firma_invalida" as const };
  return {
    estado: effectiveCardState(p),
    memberCode: p.memberCode,
    razonSocial: p.razonSocial,
    rut: maskRut(p.rut),
    comuna: p.comuna,
    tipo: "Membresía Proveedor Regional · Preinscripción",
    kycVerificado: p.kycStatus === "aprobado",
    pagoConfirmado: p.paymentStatus === "pagado",
    emitidaAt: p.cardEmitidaAt,
    validaHasta: p.cardValidaHasta,
    revocadaAt: p.cardRevocadaAt,
    consultadoAt: new Date(),
  };
}

export async function listarAdmin() {
  return db.select().from(preinscripciones).orderBy(desc(preinscripciones.createdAt));
}

export async function detalleAdmin(id: number) {
  const p = await getById(id);
  if (!p) throw httpError(404, "Preinscripción no encontrada");
  const docs = await listDocumentos(id);
  const eventos = await db
    .select()
    .from(preinscripcionEventos)
    .where(eq(preinscripcionEventos.preinscripcionId, id))
    .orderBy(desc(preinscripcionEventos.createdAt));
  const { accessTokenHash, emailOtpHash, ...safe } = p;
  return {
    ...safe,
    beneficiariosFinales: JSON.parse(p.beneficiariosFinales),
    documentos: docs.map(({ storagePath, ...d }) => ({ ...d, label: DOCUMENTO_LABEL[d.tipo as DocumentoTipo] ?? d.tipo })),
    documentosFaltantes: documentosFaltantes(p, docs),
    eventos,
    estadoTarjeta: effectiveCardState(p),
  };
}
