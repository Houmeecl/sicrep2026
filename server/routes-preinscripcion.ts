import express, { type Express, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import {
  insertPreinscripcionSchema,
  verificarOtpSchema,
  kycReviewSchema,
  revocarTarjetaSchema,
  DOCUMENTO_TIPOS,
  type DocumentoTipo,
} from "@shared/schema";
import * as svc from "./services/preinscripcion";
import { MAX_DOC_BYTES, resolveStoredPath } from "./services/documentStore";
import { buildApplePass } from "./services/wallet/apple";
import { buildGoogleSaveUrl } from "./services/wallet/google";
import { walletAssetsDir } from "./services/wallet/assets";
import { appBaseUrl, PREINSCRIPCION_FEE_CLP } from "./services/memberCard";
import { isFlowConfigured } from "./services/flow";

declare module "express-session" {
  interface SessionData {
    preinscripcionIds?: number[];
  }
}

const multerSingle = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_DOC_BYTES, files: 1 } }).single("archivo");

function uploadArchivo(req: Request, res: Response, next: NextFunction) {
  multerSingle(req, res, (err: any) => {
    if (!err) return next();
    const message = err?.code === "LIMIT_FILE_SIZE" ? "El archivo supera 8 MB" : "No se pudo leer el archivo";
    res.status(400).json({ message });
  });
}

// Límite simple por IP (en memoria) para creación y verificación de códigos.
function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ message: "Demasiadas solicitudes, intenta más tarde" });
    list.push(now);
    hits.set(key, list);
    next();
  };
}

const ip = (req: Request) => req.ip ?? "";

/** El postulante accede por su sesión (mismo navegador) o por su enlace personal (?t= o cabecera). */
async function loadOwned(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw Object.assign(new Error("Id inválido"), { status: 400 });
  const p = await svc.getById(id);
  if (!p) throw Object.assign(new Error("Preinscripción no encontrada"), { status: 404 });
  const enSesion = req.session.preinscripcionIds?.includes(id);
  const token = (req.get("x-access-token") ?? (req.query.t as string | undefined)) || undefined;
  if (!enSesion && !svc.checkAccessToken(p, token)) {
    throw Object.assign(new Error("No autorizado para ver esta preinscripción"), { status: 403 });
  }
  if (!enSesion) {
    req.session.preinscripcionIds = [...(req.session.preinscripcionIds ?? []), id];
  }
  return p;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "No autenticado" });
  if (req.session.role !== "admin") return res.status(403).json({ message: "No autorizado" });
  next();
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export function registerPreinscripcionRoutes(app: Express) {
  app.use("/wallet-assets", express.static(walletAssetsDir(), { maxAge: "7d" }));

  app.get(
    "/api/preinscripcion/config",
    wrap(async (_req, res) => {
      res.json({ monto: PREINSCRIPCION_FEE_CLP, pagoHabilitado: isFlowConfigured(), documentos: svc.DOCUMENTO_LABEL });
    })
  );

  app.post(
    "/api/preinscripcion",
    rateLimit(10, 60 * 60 * 1000),
    wrap(async (req, res) => {
      const parsed = insertPreinscripcionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Revisa los datos del formulario", errors: parsed.error.flatten() });
      const result = await svc.crear(parsed.data, { ip: ip(req), userAgent: req.get("user-agent") ?? "" });
      req.session.preinscripcionIds = [...(req.session.preinscripcionIds ?? []), result.preinscripcion.id];
      res.status(201).json({
        id: result.preinscripcion.id,
        folio: result.preinscripcion.folio,
        accessToken: result.accessToken,
        otpEnviado: result.otpEnviado,
      });
    })
  );

  app.get(
    "/api/preinscripcion/:id",
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      res.json(await svc.vistaPostulante(p));
    })
  );

  app.post(
    "/api/preinscripcion/:id/otp/reenviar",
    rateLimit(6, 60 * 60 * 1000),
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      await svc.reenviarOtp(p.id);
      res.status(204).send();
    })
  );

  app.post(
    "/api/preinscripcion/:id/otp/verificar",
    rateLimit(20, 60 * 60 * 1000),
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      const parsed = verificarOtpSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "El código tiene 6 dígitos" });
      await svc.verificarOtp(p.id, parsed.data.codigo, ip(req));
      res.json(await svc.vistaPostulante((await svc.getById(p.id))!));
    })
  );

  app.post(
    "/api/preinscripcion/:id/documentos",
    uploadArchivo,
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      const tipo = String(req.body?.tipo ?? "") as DocumentoTipo;
      if (!DOCUMENTO_TIPOS.includes(tipo)) return res.status(400).json({ message: "Tipo de documento inválido" });
      if (!req.file) return res.status(400).json({ message: "Adjunta un archivo" });
      await svc.agregarDocumento(p.id, tipo, req.file, ip(req));
      res.status(201).json(await svc.vistaPostulante((await svc.getById(p.id))!));
    })
  );

  app.post(
    "/api/preinscripcion/:id/reenviar-revision",
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      await svc.reenviarARevision(p.id, ip(req));
      res.json(await svc.vistaPostulante((await svc.getById(p.id))!));
    })
  );

  app.post(
    "/api/preinscripcion/:id/pago",
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      const base = appBaseUrl();
      const result = await svc.iniciarPago(
        p.id,
        { urlConfirmation: `${base}/api/preinscripcion/flow/confirmacion`, urlReturn: `${base}/api/preinscripcion/flow/retorno` },
        ip(req)
      );
      res.json(result);
    })
  );

  // Webhook servidor-a-servidor de Flow.
  app.post("/api/preinscripcion/flow/confirmacion", async (req, res) => {
    const token = req.body?.token;
    if (!token) return res.status(400).send("token requerido");
    try {
      await svc.confirmarPagoPorToken(String(token));
      res.status(200).send("OK");
    } catch (err: any) {
      console.error("[preinscripción] confirmación Flow:", err?.message);
      res.status(500).send("Error al confirmar el pago");
    }
  });

  // Flow devuelve al usuario con un POST (token en el cuerpo). Se confirma con Flow y se redirige a la SPA.
  app.all("/api/preinscripcion/flow/retorno", async (req, res) => {
    const token = String(req.body?.token ?? req.query.token ?? "");
    if (!token) return res.redirect(303, "/preinscripcion");
    try {
      const p = await svc.confirmarPagoPorToken(token);
      res.redirect(303, `/preinscripcion/estado?id=${p.id}`);
    } catch (err: any) {
      console.error("[preinscripción] retorno Flow:", err?.message);
      res.redirect(303, "/preinscripcion/estado?error=pago");
    }
  });

  app.get(
    "/api/preinscripcion/:id/wallet/apple",
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      const buf = await buildApplePass(p);
      res.setHeader("Content-Type", "application/vnd.apple.pkpass");
      res.setHeader("Content-Disposition", `attachment; filename="proveedor-regional-${p.memberCode}.pkpass"`);
      res.send(buf);
    })
  );

  app.get(
    "/api/preinscripcion/:id/wallet/google",
    wrap(async (req, res) => {
      const p = await loadOwned(req);
      res.redirect(302, buildGoogleSaveUrl(p));
    })
  );

  // Verificación pública de una tarjeta (lo que abre el QR).
  app.get(
    "/api/verificar/:code",
    rateLimit(120, 60 * 1000),
    wrap(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(await svc.verificarPublico(String(req.params.code), req.query.s as string | undefined));
    })
  );

  // --- Administración (rol admin) ---
  app.get(
    "/api/admin/preinscripciones",
    requireAdmin,
    wrap(async (_req, res) => {
      const rows = await svc.listarAdmin();
      res.json(
        rows.map((p) => ({
          id: p.id,
          folio: p.folio,
          razonSocial: p.razonSocial,
          rut: p.rut,
          comuna: p.comuna,
          email: p.email,
          emailVerificado: Boolean(p.emailVerificadoAt),
          esPep: p.esPep,
          paymentStatus: p.paymentStatus,
          kycStatus: p.kycStatus,
          cardStatus: p.cardStatus,
          memberCode: p.memberCode,
          createdAt: p.createdAt,
        }))
      );
    })
  );

  app.get(
    "/api/admin/preinscripciones/:id",
    requireAdmin,
    wrap(async (req, res) => {
      res.json(await svc.detalleAdmin(Number(req.params.id)));
    })
  );

  app.get(
    "/api/admin/preinscripciones/:id/documentos/:docId",
    requireAdmin,
    wrap(async (req, res) => {
      const docs = await svc.listDocumentos(Number(req.params.id));
      const doc = docs.find((d) => d.id === Number(req.params.docId));
      if (!doc) return res.status(404).json({ message: "Documento no encontrado" });
      res.setHeader("Content-Type", doc.mimeType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", `inline; filename="documento-${doc.id}.${doc.mimeType === "application/pdf" ? "pdf" : doc.mimeType.split("/")[1]}"`);
      res.sendFile(resolveStoredPath(doc.storagePath));
    })
  );

  app.post(
    "/api/admin/preinscripciones/:id/kyc",
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = kycReviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
      await svc.revisarKyc(Number(req.params.id), parsed.data, req.session.userId!, ip(req));
      res.json(await svc.detalleAdmin(Number(req.params.id)));
    })
  );

  app.post(
    "/api/admin/preinscripciones/:id/revocar",
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = revocarTarjetaSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Indica el motivo de la revocación" });
      await svc.revocarTarjeta(Number(req.params.id), parsed.data.motivo, req.session.userId!, ip(req));
      res.json(await svc.detalleAdmin(Number(req.params.id)));
    })
  );
}
