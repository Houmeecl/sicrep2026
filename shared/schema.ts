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
  uniqueIndex,
  index,
  json,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
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

// --- Sesiones (tabla de connect-pg-simple) ---
// Se declara aquí para que `drizzle-kit push` la reconozca: sin esto, cada tabla nueva hace que
// push pregunte de forma interactiva si es "session" renombrada, y el despliegue queda colgado.

export const sessionTable = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (t) => ({ expireIdx: index("IDX_session_expire").on(t.expire) })
);

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

  // Origen de la póliza: "simulado" mientras no haya credenciales reales de Nico Seguros
  // configuradas; "nico_seguros" cuando la póliza fue emitida de verdad vía su API.
  source: varchar("source", { length: 32 }).notNull().default("simulado"),
  nicoPolicyId: varchar("nico_policy_id", { length: 64 }),
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
// El estado refleja lo informado por la entidad financiera externa. Proveedor Regional no aprueba ni
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

// --- Membresía Proveedor Regional (landing /membresia) ---
// Cobro único hoy (vía Flow, igual que la convocatoria). La renovación automática /
// recurrente NO está implementada — cada ciclo de cobro futuro requeriría una nueva
// transacción manual o una integración de suscripciones aparte.

export const membershipRegistrations = pgTable("membership_registrations", {
  id: serial("id").primaryKey(),
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
});

// --- Preinscripción con KYC, pago ($20.000 vía Flow) y tarjeta de membresía en wallet ---
// Reglas que el código hace cumplir (ver server/services/preinscripcion.ts):
//  - El pago solo se habilita con correo verificado y documentos KYC obligatorios cargados.
//  - La tarjeta (código de socio + pases Apple/Google Wallet) se emite SOLO cuando el pago está
//    confirmado por Flow Y un administrador aprobó el KYC. Nunca antes, nunca simulada.
//  - Toda acción relevante queda en preinscripcion_eventos (append-only) para auditoría.

export const kycStatusEnum = pgEnum("kyc_status", [
  "borrador",
  "pendiente_revision",
  "observado",
  "aprobado",
  "rechazado",
]);

export const memberCardStatusEnum = pgEnum("member_card_status", ["no_emitida", "vigente", "revocada"]);

export const preinscripciones = pgTable("preinscripciones", {
  id: serial("id").primaryKey(),
  folio: varchar("folio", { length: 32 }).notNull().unique(),

  // Contribuyente
  tipoContribuyente: varchar("tipo_contribuyente", { length: 32 }).notNull(), // persona_juridica | persona_natural
  razonSocial: varchar("razon_social", { length: 255 }).notNull(),
  rut: varchar("rut", { length: 16 }).notNull(),
  giro: varchar("giro", { length: 255 }).notNull(),
  comuna: varchar("comuna", { length: 128 }).notNull(),
  direccion: varchar("direccion", { length: 255 }).notNull(),

  // Representante legal / titular
  repNombre: varchar("rep_nombre", { length: 255 }).notNull(),
  repRut: varchar("rep_rut", { length: 16 }).notNull(),
  repCargo: varchar("rep_cargo", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  telefono: varchar("telefono", { length: 32 }).notNull(),

  // Declaraciones KYC
  esPep: boolean("es_pep").notNull(),
  pepDetalle: text("pep_detalle").notNull().default(""),
  beneficiariosFinales: text("beneficiarios_finales").notNull().default("[]"), // JSON [{nombre,rut,porcentaje}]
  declaraVeracidad: boolean("declara_veracidad").notNull(),
  aceptaTerminosVersion: varchar("acepta_terminos_version", { length: 32 }).notNull(),
  consentimientoDatosAt: timestamp("consentimiento_datos_at").notNull(),
  consentimientoIp: varchar("consentimiento_ip", { length: 64 }).notNull(),
  consentimientoUserAgent: text("consentimiento_user_agent").notNull().default(""),

  // Verificación de correo (OTP; se guarda solo el hash)
  emailOtpHash: varchar("email_otp_hash", { length: 128 }),
  emailOtpExpiresAt: timestamp("email_otp_expires_at"),
  emailOtpIntentos: integer("email_otp_intentos").notNull().default(0),
  emailVerificadoAt: timestamp("email_verificado_at"),

  // Acceso del postulante (enlace mágico; se guarda solo el hash)
  accessTokenHash: varchar("access_token_hash", { length: 128 }).notNull(),

  // KYC
  kycStatus: kycStatusEnum("kyc_status").notNull().default("borrador"),
  kycNota: text("kyc_nota").notNull().default(""),
  kycRevisadoPor: integer("kyc_revisado_por").references(() => users.id),
  kycRevisadoAt: timestamp("kyc_revisado_at"),

  // Pago (Flow)
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pendiente"),
  flowCommerceOrder: varchar("flow_commerce_order", { length: 64 }),
  flowToken: varchar("flow_token", { length: 128 }),
  flowFlowOrder: varchar("flow_flow_order", { length: 64 }),
  flowRawStatus: text("flow_raw_status"),
  paidAt: timestamp("paid_at"),

  // Tarjeta de membresía (preinscripción)
  cardStatus: memberCardStatusEnum("card_status").notNull().default("no_emitida"),
  memberCode: varchar("member_code", { length: 32 }).unique(),
  cardSerial: varchar("card_serial", { length: 64 }).unique(),
  cardEmitidaAt: timestamp("card_emitida_at"),
  cardValidaHasta: timestamp("card_valida_hasta"),
  cardRevocadaAt: timestamp("card_revocada_at"),
  cardRevocacionMotivo: text("card_revocacion_motivo").notNull().default(""),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  // Un RUT solo puede tener una preinscripción activa (las rechazadas no bloquean reintentar).
  rutActivo: uniqueIndex("preinscripciones_rut_activo").on(t.rut).where(sql`kyc_status <> 'rechazado'`),
}));

export const preinscripcionDocumentos = pgTable("preinscripcion_documentos", {
  id: serial("id").primaryKey(),
  preinscripcionId: integer("preinscripcion_id").notNull().references(() => preinscripciones.id),
  tipo: varchar("tipo", { length: 64 }).notNull(), // cedula_frente | cedula_reverso | inicio_actividades | escritura_poderes
  nombreOriginal: varchar("nombre_original", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  bytes: integer("bytes").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cada intento de pago en Flow queda registrado: si el postulante reintenta, la orden anterior
// sigue siendo reconocible y un pago tardío sobre ella se acredita (o se marca para devolución).
export const preinscripcionPagos = pgTable("preinscripcion_pagos", {
  id: serial("id").primaryKey(),
  preinscripcionId: integer("preinscripcion_id").notNull().references(() => preinscripciones.id),
  commerceOrder: varchar("commerce_order", { length: 64 }).notNull().unique(),
  flowToken: varchar("flow_token", { length: 128 }).notNull().unique(),
  flowOrder: varchar("flow_order", { length: 64 }),
  status: paymentStatusEnum("status").notNull().default("en_proceso"),
  rawStatus: text("raw_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const preinscripcionEventos = pgTable("preinscripcion_eventos", {
  id: serial("id").primaryKey(),
  preinscripcionId: integer("preinscripcion_id").notNull().references(() => preinscripciones.id),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  detalle: text("detalle").notNull().default(""),
  actorUserId: integer("actor_user_id").references(() => users.id),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const insertMembershipRegistrationSchema = z.object({
  companyName: z.string().min(2),
  rut: z.string().min(3),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(5),
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

// --- Preinscripción: validaciones de entrada ---

export const PREINSCRIPCION_TERMINOS_VERSION = "2026-10";

export const DOCUMENTO_TIPOS = ["cedula_frente", "cedula_reverso", "inicio_actividades", "escritura_poderes"] as const;
export type DocumentoTipo = (typeof DOCUMENTO_TIPOS)[number];

const beneficiarioSchema = z.object({
  nombre: z.string().trim().min(3).max(255),
  rut: z.string().trim().min(3).max(16),
  porcentaje: z.coerce.number().min(10).max(100),
});

export const insertPreinscripcionSchema = z.object({
  tipoContribuyente: z.enum(["persona_juridica", "persona_natural"]),
  razonSocial: z.string().trim().min(2).max(255),
  rut: z.string().trim().min(3).max(16),
  giro: z.string().trim().min(2).max(255),
  comuna: z.string().trim().min(2).max(128),
  direccion: z.string().trim().min(4).max(255),
  repNombre: z.string().trim().min(3).max(255),
  repRut: z.string().trim().min(3).max(16),
  repCargo: z.string().trim().min(2).max(128),
  email: z.string().trim().toLowerCase().email().max(255),
  telefono: z.string().trim().regex(/^\+?56\s?9\s?\d{4}\s?\d{4}$/, "Teléfono móvil chileno: +56 9 XXXX XXXX"),
  esPep: z.boolean(),
  pepDetalle: z.string().trim().max(2000).optional().default(""),
  beneficiariosFinales: z.array(beneficiarioSchema).max(10).default([]),
  declaraVeracidad: z.literal(true, { errorMap: () => ({ message: "Debes declarar la veracidad de los datos" }) }),
  aceptaTerminos: z.literal(true, { errorMap: () => ({ message: "Debes aceptar los términos" }) }),
  aceptaTratamientoDatos: z.literal(true, { errorMap: () => ({ message: "Debes autorizar el tratamiento de datos" }) }),
});

export const verificarOtpSchema = z.object({ codigo: z.string().trim().regex(/^\d{6}$/) });

export const kycReviewSchema = z.object({
  decision: z.enum(["aprobado", "observado", "rechazado"]),
  nota: z.string().trim().max(2000).default(""),
});

export const revocarTarjetaSchema = z.object({ motivo: z.string().trim().min(3).max(2000) });

export type Preinscripcion = typeof preinscripciones.$inferSelect;
export type PreinscripcionDocumento = typeof preinscripcionDocumentos.$inferSelect;
export type PreinscripcionEvento = typeof preinscripcionEventos.$inferSelect;
export type InsertPreinscripcion = z.infer<typeof insertPreinscripcionSchema>;
export type KycReviewInput = z.infer<typeof kycReviewSchema>;

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
export type MembershipRegistration = typeof membershipRegistrations.$inferSelect;
export type InsertMembershipRegistration = z.infer<typeof insertMembershipRegistrationSchema>;
