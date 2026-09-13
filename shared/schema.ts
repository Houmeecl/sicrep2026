import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", [
  "provider",
  "company_admin",
  "executive",
  "admin",
]);

export const planEnum = pgEnum("plan", ["base", "desarrollo", "empresa"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "pendiente",
  "validando",
  "aprobada",
  "rechazada",
]);

export const policyStatusEnum = pgEnum("policy_status", [
  "activa",
  "suspendida",
  "vencida",
]);

export const cardControlActionEnum = pgEnum("card_control_action", [
  "activar",
  "bloquear",
  "solicitar_aumento_cupo",
]);

export const financingProjectStatusEnum = pgEnum("financing_project_status", [
  "preparacion",
  "postulado",
  "en_evaluacion_entidad",
  "aprobado_por_entidad",
  "rechazado_por_entidad",
]);

export const impactRecordStatusEnum = pgEnum("impact_record_status", [
  "estimado",
  "en_revision",
  "validado",
  "rechazado",
  "ajustado",
  "revertido",
]);

export const pointsLedgerTypeEnum = pgEnum("points_ledger_type", [
  "otorgado",
  "ajuste",
  "reversion",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pendiente",
  "pago_no_habilitado",
  "en_proceso",
  "pagado",
  "rechazado",
  "anulado",
]);

export const founderStatusEnum = pgEnum("founder_status", [
  "pendiente_revision",
  "confirmado",
  "rechazado",
]);

// --- Usuarios y cuentas ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("provider"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const executives = pgTable("executives", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull().default("Ejecutivo/a Proveedor Regional"),
  email: varchar("email", { length: 255 }).notNull(),
});

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 32 }).notNull().unique(),
  region: varchar("region", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }).notNull(),
  plan: planEnum("plan").notNull().default("base"),
  developmentLevel: integer("development_level").notNull().default(20),
  executiveId: integer("executive_id").references(() => executives.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 32 }).notNull().unique(),
  sharedBranding: boolean("shared_branding").notNull().default(false),
  executiveId: integer("executive_id").references(() => executives.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companyProviderLinks = pgTable("company_provider_links", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Postulaciones ---

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 32 }).notNull(),
  region: varchar("region", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 64 }).notNull(),
  status: applicationStatusEnum("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Tarjeta Proveedor Regional (simulada, capa de integración Pomelo) ---

export const cardAccounts = pgTable("card_accounts", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id).unique(),
  cardNumberMasked: varchar("card_number_masked", { length: 32 }).notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  creditLine: numeric("credit_line", { precision: 14, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 32 }).notNull().default("activa"),
  pomeloAccountId: varchar("pomelo_account_id", { length: 64 }),
});

export const cardTransactions = pgTable("card_transactions", {
  id: serial("id").primaryKey(),
  cardAccountId: integer("card_account_id").notNull().references(() => cardAccounts.id),
  description: varchar("description", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Protección paramétrica ---

export const insurancePolicies = pgTable("insurance_policies", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  coverageType: varchar("coverage_type", { length: 255 }).notNull(),
  status: policyStatusEnum("status").notNull().default("activa"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
});

// --- Finanzas sostenibles: bitácora de controles de tarjeta ---
// Emisión/gestión de tarjeta sigue simulada en server/services/pomelo.ts. La interfaz de
// integración con el módulo externo de tarjetas ("Cursor") está preparada pero no conectada
// (ver server/services/cursor-integration.ts) — su código no ha sido identificado ni revisado.

export const cardEvents = pgTable("card_events", {
  id: serial("id").primaryKey(),
  cardAccountId: integer("card_account_id").notNull().references(() => cardAccounts.id),
  action: cardControlActionEnum("action").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Financiamiento verde ---
// El estado refleja lo informado por la entidad financiera externa. SICREP no aprueba ni
// desembolsa fondos: solo registra la postulación y su estado reportado.

export const greenFinancingProjects = pgTable("green_financing_projects", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  investmentAmount: numeric("investment_amount", { precision: 14, scale: 2 }).notNull(),
  fundsDestination: text("funds_destination").notNull(),
  background: text("background").notNull().default(""),
  status: financingProjectStatusEnum("status").notNull().default("preparacion"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Impacto (reducción de CO2e): estimaciones autoreportadas y validación por la empresa ---
// La tarjeta por sí sola no acredita ninguna reducción. La reducción "estimada" se calcula y
// congela al crear el registro (consumptionValue × emissionFactor) para dejar el cálculo
// trazable; la reducción "validada" solo la completa la revisión de la empresa patrocinadora.

export const impactRecords = pgTable("impact_records", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  financingProjectId: integer("financing_project_id").references(() => greenFinancingProjects.id),
  baselinePeriod: varchar("baseline_period", { length: 64 }).notNull(),
  period: varchar("period", { length: 64 }).notNull(),
  activity: varchar("activity", { length: 255 }).notNull(),
  consumptionValue: numeric("consumption_value", { precision: 14, scale: 3 }).notNull(),
  consumptionUnit: varchar("consumption_unit", { length: 64 }).notNull(),
  emissionFactor: numeric("emission_factor", { precision: 14, scale: 6 }).notNull(),
  factorVersion: varchar("factor_version", { length: 128 }).notNull(),
  method: text("method").notNull(),
  evidenceNotes: text("evidence_notes").notNull().default(""),
  estimatedReductionTco2e: numeric("estimated_reduction_tco2e", { precision: 14, scale: 3 }).notNull(),
  validatedReductionTco2e: numeric("validated_reduction_tco2e", { precision: 14, scale: 3 }),
  status: impactRecordStatusEnum("status").notNull().default("estimado"),
  reviewedByCompanyId: integer("reviewed_by_company_id").references(() => companies.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Puntos: incentivos internos del programa, no créditos de carbono ni dinero ---
// Libro de asientos append-only: nunca se edita una fila, solo se agregan otorgado/ajuste/
// reversión. La regla de conversión puntos↔tCO2e no está definida oficialmente (ver
// server/services/points.ts) — el valor usado en cada asiento queda registrado tal como se
// otorgó, independiente de si la regla demo cambia después.

export const pointsLedger = pgTable("points_ledger", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  impactRecordId: integer("impact_record_id").notNull().references(() => impactRecords.id),
  points: integer("points").notNull(),
  type: pointsLedgerTypeEnum("type").notNull(),
  note: text("note").notNull().default(""),
  createdByCompanyId: integer("created_by_company_id").references(() => companies.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Convocatoria regional: cupos por comuna e inscripción con pago ---
// El pago real se procesa vía Flow (server/services/flow.ts). Sin credenciales de Flow
// configuradas, las inscripciones quedan en estado "pago_no_habilitado" — nunca se marca
// una inscripción como "pagado" salvo confirmación real recibida desde Flow.

export const convocatoriaComunas = pgTable("convocatoria_comunas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 128 }).notNull().unique(),
  poblacion: integer("poblacion").notNull(),
  cupos: integer("cupos").notNull(),
});

export const convocatoriaInscripciones = pgTable("convocatoria_inscripciones", {
  id: serial("id").primaryKey(),
  comunaId: integer("comuna_id").notNull().references(() => convocatoriaComunas.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 32 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 64 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pendiente"),
  flowCommerceOrder: varchar("flow_commerce_order", { length: 64 }),
  flowToken: varchar("flow_token", { length: 128 }),
  flowFlowOrder: varchar("flow_flow_order", { length: 64 }),
  flowRawStatus: text("flow_raw_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),

  // Estatus de socio fundador: requiere pago confirmado + revisión manual de que la
  // empresa no tenga problemas tributarios ni laborales. Nunca se otorga automáticamente.
  founderStatus: founderStatusEnum("founder_status").notNull().default("pendiente_revision"),
  founderReviewNote: text("founder_review_note").notNull().default(""),
  founderReviewedAt: timestamp("founder_reviewed_at"),

  // Sorteo del impulso a viaje de negocios a Brasil (50 cupos entre los inscritos pagados).
  brasilTripSelected: boolean("brasil_trip_selected").notNull().default(false),
  brasilTripSelectedAt: timestamp("brasil_trip_selected_at"),
});

// --- Academia Proveedor Regional ---

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  durationHours: integer("duration_hours").notNull().default(4),
  description: text("description").notNull().default(""),
});

export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
});

// --- Centro Proveedor Regional: asesorías ---

export const advisorySessions = pgTable("advisory_sessions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id),
  executiveId: integer("executive_id").references(() => executives.id),
  topic: varchar("topic", { length: 255 }).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
});

// --- Relations ---

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, { fields: [providers.userId], references: [users.id] }),
  executive: one(executives, { fields: [providers.executiveId], references: [executives.id] }),
  cardAccount: one(cardAccounts, { fields: [providers.id], references: [cardAccounts.providerId] }),
  policies: many(insurancePolicies),
  enrollments: many(courseEnrollments),
  advisorySessions: many(advisorySessions),
  companyLinks: many(companyProviderLinks),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
  executive: one(executives, { fields: [companies.executiveId], references: [executives.id] }),
  providerLinks: many(companyProviderLinks),
}));

export const companyProviderLinksRelations = relations(companyProviderLinks, ({ one }) => ({
  company: one(companies, { fields: [companyProviderLinks.companyId], references: [companies.id] }),
  provider: one(providers, { fields: [companyProviderLinks.providerId], references: [providers.id] }),
}));

export const cardAccountsRelations = relations(cardAccounts, ({ one, many }) => ({
  provider: one(providers, { fields: [cardAccounts.providerId], references: [providers.id] }),
  transactions: many(cardTransactions),
  events: many(cardEvents),
}));

export const cardEventsRelations = relations(cardEvents, ({ one }) => ({
  cardAccount: one(cardAccounts, { fields: [cardEvents.cardAccountId], references: [cardAccounts.id] }),
}));

export const greenFinancingProjectsRelations = relations(greenFinancingProjects, ({ one, many }) => ({
  provider: one(providers, { fields: [greenFinancingProjects.providerId], references: [providers.id] }),
  impactRecords: many(impactRecords),
}));

export const impactRecordsRelations = relations(impactRecords, ({ one, many }) => ({
  provider: one(providers, { fields: [impactRecords.providerId], references: [providers.id] }),
  financingProject: one(greenFinancingProjects, {
    fields: [impactRecords.financingProjectId],
    references: [greenFinancingProjects.id],
  }),
  reviewedByCompany: one(companies, { fields: [impactRecords.reviewedByCompanyId], references: [companies.id] }),
  pointsLedgerEntries: many(pointsLedger),
}));

export const convocatoriaComunasRelations = relations(convocatoriaComunas, ({ many }) => ({
  inscripciones: many(convocatoriaInscripciones),
}));

export const convocatoriaInscripcionesRelations = relations(convocatoriaInscripciones, ({ one }) => ({
  comuna: one(convocatoriaComunas, { fields: [convocatoriaInscripciones.comunaId], references: [convocatoriaComunas.id] }),
}));

export const pointsLedgerRelations = relations(pointsLedger, ({ one }) => ({
  provider: one(providers, { fields: [pointsLedger.providerId], references: [providers.id] }),
  impactRecord: one(impactRecords, { fields: [pointsLedger.impactRecordId], references: [impactRecords.id] }),
  createdByCompany: one(companies, { fields: [pointsLedger.createdByCompanyId], references: [companies.id] }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  provider: one(providers, { fields: [courseEnrollments.providerId], references: [providers.id] }),
}));

// --- Zod insert schemas ---

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const cardControlSchema = z.object({
  action: z.enum(["activar", "bloquear", "solicitar_aumento_cupo"]),
  note: z.string().optional(),
});

export const insertGreenFinancingProjectSchema = z.object({
  projectName: z.string().min(2),
  investmentAmount: z.coerce.number().positive(),
  fundsDestination: z.string().min(2),
  background: z.string().optional(),
});

export const insertImpactRecordSchema = z.object({
  financingProjectId: z.coerce.number().int().optional(),
  baselinePeriod: z.string().min(1),
  period: z.string().min(1),
  activity: z.string().min(2),
  consumptionValue: z.coerce.number().positive(),
  consumptionUnit: z.string().min(1),
  emissionFactor: z.coerce.number().positive(),
  factorVersion: z.string().min(1),
  method: z.string().min(2),
  evidenceNotes: z.string().optional(),
});

export const reviewImpactRecordSchema = z.object({
  decision: z.enum(["validado", "rechazado"]),
  validatedReductionTco2e: z.coerce.number().nonnegative().optional(),
  note: z.string().optional(),
});

export const grantPointsSchema = z.object({
  points: z.coerce.number().int().positive(),
  note: z.string().optional(),
});

export const pointsAdjustmentSchema = z.object({
  points: z.coerce.number().int().refine((n) => n !== 0, "No puede ser 0"),
  type: z.enum(["ajuste", "reversion"]),
  note: z.string().min(2),
});

export const insertConvocatoriaInscripcionSchema = z.object({
  comunaId: z.coerce.number().int(),
  companyName: z.string().min(2),
  rut: z.string().min(3),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(5),
});

export const founderReviewSchema = z.object({
  decision: z.enum(["confirmado", "rechazado"]),
  note: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(["provider", "company_admin"]),
  companyName: z.string().min(2),
  rut: z.string().min(3),
  region: z.string().optional(),
  industry: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Provider = typeof providers.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type CardAccount = typeof cardAccounts.$inferSelect;
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type InsurancePolicy = typeof insurancePolicies.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type AdvisorySession = typeof advisorySessions.$inferSelect;
export type Executive = typeof executives.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CardEvent = typeof cardEvents.$inferSelect;
export type GreenFinancingProject = typeof greenFinancingProjects.$inferSelect;
export type ImpactRecord = typeof impactRecords.$inferSelect;
export type PointsLedgerEntry = typeof pointsLedger.$inferSelect;
export type CardControlInput = z.infer<typeof cardControlSchema>;
export type InsertGreenFinancingProject = z.infer<typeof insertGreenFinancingProjectSchema>;
export type InsertImpactRecord = z.infer<typeof insertImpactRecordSchema>;
export type ReviewImpactRecordInput = z.infer<typeof reviewImpactRecordSchema>;
export type GrantPointsInput = z.infer<typeof grantPointsSchema>;
export type PointsAdjustmentInput = z.infer<typeof pointsAdjustmentSchema>;
export type ConvocatoriaComuna = typeof convocatoriaComunas.$inferSelect;
export type ConvocatoriaInscripcion = typeof convocatoriaInscripciones.$inferSelect;
export type InsertConvocatoriaInscripcion = z.infer<typeof insertConvocatoriaInscripcionSchema>;
export type FounderReviewInput = z.infer<typeof founderReviewSchema>;
