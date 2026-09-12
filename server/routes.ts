import type { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import {
  insertApplicationSchema,
  loginSchema,
  registerSchema,
  cardControlSchema,
  insertGreenFinancingProjectSchema,
  insertImpactRecordSchema,
  reviewImpactRecordSchema,
  grantPointsSchema,
  pointsAdjustmentSchema,
  insertConvocatoriaInscripcionSchema,
  founderReviewSchema,
} from "@shared/schema";
import { suggestDemoPoints, DEMO_POINTS_RULE_LABEL } from "./services/points";
import { isFlowConfigured } from "./services/flow";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "No autenticado" });
  }
  next();
}

function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session.role !== role) {
      return res.status(403).json({ message: "No autorizado" });
    }
    next();
  };
}

export function registerRoutes(app: Express) {
  // --- Postulación (pública) ---
  app.post("/api/applications", async (req, res) => {
    const parsed = insertApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    }
    const application = await storage.createApplication(parsed.data);
    res.status(201).json(application);
  });

  // --- Auth ---
  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    }
    const data = parsed.data;

    const existing = await storage.getUserByEmail(data.email);
    if (existing) {
      return res.status(409).json({ message: "Ya existe una cuenta con ese correo" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await storage.createUser({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
    });

    if (data.role === "provider") {
      await storage.createProviderForUser(user.id, {
        companyName: data.companyName,
        rut: data.rut,
        region: data.region ?? "Antofagasta",
        industry: data.industry ?? "Servicios generales",
      });
    } else {
      await storage.createCompanyForUser(user.id, {
        companyName: data.companyName,
        rut: data.rut,
      });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    res.status(201).json({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos inválidos" });
    }
    const user = await storage.getUserByEmail(parsed.data.email);
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.status(204).send());
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "No autenticado" });
    res.json({ id: user.id, email: user.email, role: user.role, fullName: user.fullName });
  });

  // --- Panel proveedor ---
  app.get("/api/provider/dashboard", requireAuth, requireRole("provider"), async (req, res) => {
    const provider = await storage.getProviderByUserId(req.session.userId!);
    if (!provider) return res.status(404).json({ message: "Proveedor no encontrado" });
    const dashboard = await storage.getProviderDashboard(provider.id);
    res.json(dashboard);
  });

  app.get("/api/courses", requireAuth, async (_req, res) => {
    res.json(await storage.listCourses());
  });

  // --- Finanzas sostenibles: tarjeta (proveedor) ---
  app.post("/api/provider/card/controls", requireAuth, requireRole("provider"), async (req, res, next) => {
    const parsed = cardControlSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
    try {
      const provider = await storage.getProviderByUserId(req.session.userId!);
      if (!provider) return res.status(404).json({ message: "Proveedor no encontrado" });
      const event = await storage.setCardStatus(provider.id, parsed.data.action, parsed.data.note);
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  });

  // --- Financiamiento verde (proveedor) ---
  app.post("/api/provider/green-financing", requireAuth, requireRole("provider"), async (req, res) => {
    const parsed = insertGreenFinancingProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    const provider = await storage.getProviderByUserId(req.session.userId!);
    if (!provider) return res.status(404).json({ message: "Proveedor no encontrado" });
    const project = await storage.createGreenFinancingProject(provider.id, parsed.data);
    res.status(201).json(project);
  });

  // --- Impacto y puntos (proveedor autoreporta) ---
  app.post("/api/provider/impact-records", requireAuth, requireRole("provider"), async (req, res) => {
    const parsed = insertImpactRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    const provider = await storage.getProviderByUserId(req.session.userId!);
    if (!provider) return res.status(404).json({ message: "Proveedor no encontrado" });
    const record = await storage.createImpactRecord(provider.id, parsed.data);
    res.status(201).json(record);
  });

  // --- Panel empresa ---
  app.get("/api/company/impact", requireAuth, requireRole("company_admin"), async (req, res) => {
    const company = await storage.getCompanyByUserId(req.session.userId!);
    if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
    const panel = await storage.getCompanyImpactPanel(company.id);
    res.json({ company, ...panel });
  });

  app.get("/api/company/impact-records/pending", requireAuth, requireRole("company_admin"), async (req, res) => {
    const company = await storage.getCompanyByUserId(req.session.userId!);
    if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
    const records = await storage.listPendingImpactRecordsForCompany(company.id);
    res.json({ records, demoPointsRuleLabel: DEMO_POINTS_RULE_LABEL });
  });

  app.post("/api/company/impact-records/:id/review", requireAuth, requireRole("company_admin"), async (req, res, next) => {
    const parsed = reviewImpactRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
    try {
      const company = await storage.getCompanyByUserId(req.session.userId!);
      if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
      const record = await storage.reviewImpactRecord(Number(req.params.id), company.id, parsed.data);
      res.json(record);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/company/impact-records/:id/grant-points", requireAuth, requireRole("company_admin"), async (req, res, next) => {
    const parsed = grantPointsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
    try {
      const company = await storage.getCompanyByUserId(req.session.userId!);
      if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
      const entry = await storage.grantPoints(Number(req.params.id), company.id, parsed.data.points, parsed.data.note);
      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/company/impact-records/:id/points-adjustment", requireAuth, requireRole("company_admin"), async (req, res, next) => {
    const parsed = pointsAdjustmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    try {
      const company = await storage.getCompanyByUserId(req.session.userId!);
      if (!company) return res.status(404).json({ message: "Empresa no encontrada" });
      const entry = await storage.adjustOrReversePoints(Number(req.params.id), company.id, parsed.data);
      res.status(201).json(entry);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/points/demo-suggestion/:tco2e", requireAuth, (req, res) => {
    const tco2e = Number(req.params.tco2e);
    res.json({ suggestedPoints: suggestDemoPoints(tco2e), label: DEMO_POINTS_RULE_LABEL });
  });

  // --- Convocatoria regional (pública): cupos por comuna e inscripción con pago ---
  app.get("/api/convocatoria/comunas", async (_req, res) => {
    const comunas = await storage.listComunasConDisponibilidad();
    res.json({ comunas, flowHabilitado: isFlowConfigured() });
  });

  app.post("/api/convocatoria/inscripciones", async (req, res, next) => {
    const parsed = insertConvocatoriaInscripcionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.flatten() });
    try {
      const baseUrl = process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? 5000}`;
      const result = await storage.createInscripcionConPago(parsed.data, {
        urlConfirmation: `${baseUrl}/api/convocatoria/flow/confirmacion`,
        urlReturn: `${baseUrl}/convocatoria/retorno`,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Webhook servidor-a-servidor de Flow (POST con el token).
  app.post("/api/convocatoria/flow/confirmacion", async (req, res) => {
    const token = req.body?.token;
    if (!token) return res.status(400).send("token requerido");
    try {
      await storage.confirmFlowPaymentByToken(String(token));
      res.status(200).send("OK");
    } catch (err) {
      res.status(500).send("Error al confirmar el pago");
    }
  });

  // Consulta de estado para la página de retorno del usuario tras pagar.
  app.get("/api/convocatoria/inscripciones/by-token/:token", async (req, res) => {
    const inscripcion = await storage.getInscripcionByToken(req.params.token);
    if (!inscripcion) return res.status(404).json({ message: "No encontrada" });
    res.json(inscripcion);
  });

  // --- Administración de la convocatoria (solo rol admin) ---
  app.get("/api/admin/convocatoria/inscripciones", requireAuth, requireRole("admin"), async (_req, res) => {
    res.json(await storage.listInscripcionesAdmin());
  });

  app.post(
    "/api/admin/convocatoria/inscripciones/:id/founder-review",
    requireAuth,
    requireRole("admin"),
    async (req, res, next) => {
      const parsed = founderReviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Datos inválidos" });
      try {
        const updated = await storage.reviewFounderStatus(Number(req.params.id), parsed.data);
        res.json(updated);
      } catch (err) {
        next(err);
      }
    }
  );

  app.post("/api/admin/convocatoria/sorteo-china", requireAuth, requireRole("admin"), async (_req, res) => {
    const result = await storage.runChinaTripRaffle();
    res.json(result);
  });
}
