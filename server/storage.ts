import { db } from "./db";
import {
  users,
  providers,
  companies,
  companyProviderLinks,
  applications,
  cardAccounts,
  cardTransactions,
  cardEvents,
  greenFinancingProjects,
  impactRecords,
  pointsLedger,
  insurancePolicies,
  courses,
  courseEnrollments,
  advisorySessions,
  executives,
  convocatoriaComunas,
  convocatoriaInscripciones,
  type InsertUser,
  type InsertApplication,
  type InsertGreenFinancingProject,
  type InsertImpactRecord,
  type InsertConvocatoriaInscripcion,
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { issueCard, initialCreditLine } from "./services/pomelo";
import { defaultCoverageForPlan } from "./services/parametric";
import { INSCRIPTION_FEE_CLP } from "./services/cupos";
import { createPayment, getPaymentStatus, isFlowConfigured } from "./services/flow";
import { sortearGanadores, CUPOS_VIAJE_BRASIL } from "./services/sorteo";
import type { FounderReviewInput } from "@shared/schema";

export const storage = {
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },

  async getUserById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async createUser(data: InsertUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async createProviderForUser(userId: number, input: {
    companyName: string;
    rut: string;
    region: string;
    industry: string;
  }) {
    const [defaultExecutive] = await db.select().from(executives).limit(1);

    const [provider] = await db
      .insert(providers)
      .values({
        userId,
        companyName: input.companyName,
        rut: input.rut,
        region: input.region,
        industry: input.industry,
        plan: "base",
        developmentLevel: 20,
        executiveId: defaultExecutive?.id,
      })
      .returning();

    const card = issueCard();
    await db.insert(cardAccounts).values({
      providerId: provider.id,
      cardNumberMasked: card.cardNumberMasked,
      pomeloAccountId: card.pomeloAccountId,
      balance: "0",
      creditLine: String(initialCreditLine(provider.plan)),
      status: "activa",
    });

    await db.insert(insurancePolicies).values({
      providerId: provider.id,
      coverageType: defaultCoverageForPlan(provider.plan),
      status: "activa",
    });

    return provider;
  },

  async createCompanyForUser(userId: number, input: { companyName: string; rut: string }) {
    const [defaultExecutive] = await db.select().from(executives).limit(1);
    const [company] = await db
      .insert(companies)
      .values({
        userId,
        companyName: input.companyName,
        rut: input.rut,
        executiveId: defaultExecutive?.id,
      })
      .returning();
    return company;
  },

  async getProviderByUserId(userId: number) {
    const [provider] = await db.select().from(providers).where(eq(providers.userId, userId));
    return provider;
  },

  async getCompanyByUserId(userId: number) {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
    return company;
  },

  async getProviderDashboard(providerId: number) {
    const [provider] = await db.select().from(providers).where(eq(providers.id, providerId));
    if (!provider) return null;

    const [account] = await db
      .select()
      .from(cardAccounts)
      .where(eq(cardAccounts.providerId, providerId));

    const policies = await db
      .select()
      .from(insurancePolicies)
      .where(eq(insurancePolicies.providerId, providerId));

    const enrollments = await db
      .select({
        id: courseEnrollments.id,
        progress: courseEnrollments.progress,
        completed: courseEnrollments.completed,
        courseId: courses.id,
        title: courses.title,
        category: courses.category,
        durationHours: courses.durationHours,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.providerId, providerId));

    const upcomingSessions = await db
      .select()
      .from(advisorySessions)
      .where(eq(advisorySessions.providerId, providerId));

    const executive = provider.executiveId
      ? (await db.select().from(executives).where(eq(executives.id, provider.executiveId)))[0]
      : undefined;

    const events = account
      ? await db.select().from(cardEvents).where(eq(cardEvents.cardAccountId, account.id)).orderBy(desc(cardEvents.createdAt))
      : [];

    const transactions = account
      ? await db.select().from(cardTransactions).where(eq(cardTransactions.cardAccountId, account.id)).orderBy(desc(cardTransactions.createdAt))
      : [];

    const financingProjects = await db
      .select()
      .from(greenFinancingProjects)
      .where(eq(greenFinancingProjects.providerId, providerId))
      .orderBy(desc(greenFinancingProjects.createdAt));

    const records = await db
      .select()
      .from(impactRecords)
      .where(eq(impactRecords.providerId, providerId))
      .orderBy(desc(impactRecords.createdAt));

    const recordsWithLedger = await Promise.all(
      records.map(async (r) => {
        const ledger = await db
          .select()
          .from(pointsLedger)
          .where(eq(pointsLedger.impactRecordId, r.id))
          .orderBy(desc(pointsLedger.createdAt));
        return { ...r, pointsLedger: ledger };
      })
    );

    return {
      provider,
      account,
      policies,
      enrollments,
      upcomingSessions,
      executive,
      cardEvents: events,
      cardTransactions: transactions,
      greenFinancingProjects: financingProjects,
      impactRecords: recordsWithLedger,
    };
  },

  // --- Finanzas sostenibles: tarjeta ---

  async setCardStatus(providerId: number, action: "activar" | "bloquear" | "solicitar_aumento_cupo", note?: string) {
    const [account] = await db.select().from(cardAccounts).where(eq(cardAccounts.providerId, providerId));
    if (!account) throw Object.assign(new Error("Cuenta de tarjeta no encontrada"), { status: 404 });

    if (action === "activar" || action === "bloquear") {
      await db
        .update(cardAccounts)
        .set({ status: action === "activar" ? "activa" : "bloqueada" })
        .where(eq(cardAccounts.id, account.id));
    }

    const [event] = await db
      .insert(cardEvents)
      .values({ cardAccountId: account.id, action, note: note ?? "" })
      .returning();
    return event;
  },

  // --- Financiamiento verde ---

  async createGreenFinancingProject(providerId: number, input: InsertGreenFinancingProject) {
    const [project] = await db
      .insert(greenFinancingProjects)
      .values({
        providerId,
        projectName: input.projectName,
        investmentAmount: String(input.investmentAmount),
        fundsDestination: input.fundsDestination,
        background: input.background ?? "",
        status: "postulado",
      })
      .returning();
    return project;
  },

  // --- Impacto y puntos ---

  async createImpactRecord(providerId: number, input: InsertImpactRecord) {
    const estimatedReductionTco2e = input.consumptionValue * input.emissionFactor;
    const [record] = await db
      .insert(impactRecords)
      .values({
        providerId,
        financingProjectId: input.financingProjectId,
        baselinePeriod: input.baselinePeriod,
        period: input.period,
        activity: input.activity,
        consumptionValue: String(input.consumptionValue),
        consumptionUnit: input.consumptionUnit,
        emissionFactor: String(input.emissionFactor),
        factorVersion: input.factorVersion,
        method: input.method,
        evidenceNotes: input.evidenceNotes ?? "",
        estimatedReductionTco2e: String(estimatedReductionTco2e),
        status: "estimado",
      })
      .returning();
    return record;
  },

  async isProviderLinkedToCompany(providerId: number, companyId: number) {
    const [link] = await db
      .select()
      .from(companyProviderLinks)
      .where(and(eq(companyProviderLinks.providerId, providerId), eq(companyProviderLinks.companyId, companyId)));
    return Boolean(link);
  },

  async listPendingImpactRecordsForCompany(companyId: number) {
    const links = await db
      .select({ providerId: companyProviderLinks.providerId })
      .from(companyProviderLinks)
      .where(eq(companyProviderLinks.companyId, companyId));

    const results = [];
    for (const link of links) {
      const [provider] = await db.select().from(providers).where(eq(providers.id, link.providerId));
      const records = await db
        .select()
        .from(impactRecords)
        .where(eq(impactRecords.providerId, link.providerId))
        .orderBy(desc(impactRecords.createdAt));
      for (const r of records) {
        const ledger = await db.select().from(pointsLedger).where(eq(pointsLedger.impactRecordId, r.id));
        results.push({ ...r, providerName: provider?.companyName, pointsLedger: ledger });
      }
    }
    return results;
  },

  async reviewImpactRecord(
    impactRecordId: number,
    companyId: number,
    input: { decision: "validado" | "rechazado"; validatedReductionTco2e?: number; note?: string }
  ) {
    const [record] = await db.select().from(impactRecords).where(eq(impactRecords.id, impactRecordId));
    if (!record) throw Object.assign(new Error("Registro de impacto no encontrado"), { status: 404 });

    const linked = await this.isProviderLinkedToCompany(record.providerId, companyId);
    if (!linked) throw Object.assign(new Error("Este proveedor no está patrocinado por tu empresa"), { status: 403 });

    const [updated] = await db
      .update(impactRecords)
      .set({
        status: input.decision,
        validatedReductionTco2e:
          input.decision === "validado" && input.validatedReductionTco2e !== undefined
            ? String(input.validatedReductionTco2e)
            : record.validatedReductionTco2e,
        reviewedByCompanyId: companyId,
        reviewedAt: new Date(),
      })
      .where(eq(impactRecords.id, impactRecordId))
      .returning();
    return updated;
  },

  async grantPoints(impactRecordId: number, companyId: number, points: number, note?: string) {
    const [record] = await db.select().from(impactRecords).where(eq(impactRecords.id, impactRecordId));
    if (!record) throw Object.assign(new Error("Registro de impacto no encontrado"), { status: 404 });

    const linked = await this.isProviderLinkedToCompany(record.providerId, companyId);
    if (!linked) throw Object.assign(new Error("Este proveedor no está patrocinado por tu empresa"), { status: 403 });

    if (record.status !== "validado") {
      throw Object.assign(new Error("Solo se pueden otorgar puntos sobre una reducción validada"), { status: 409 });
    }

    const existingGrant = await db
      .select()
      .from(pointsLedger)
      .where(and(eq(pointsLedger.impactRecordId, impactRecordId), eq(pointsLedger.type, "otorgado")));
    if (existingGrant.length > 0) {
      throw Object.assign(new Error("Ya se otorgaron puntos por esta reducción"), { status: 409 });
    }

    const [entry] = await db
      .insert(pointsLedger)
      .values({
        providerId: record.providerId,
        impactRecordId,
        points,
        type: "otorgado",
        note: note ?? "",
        createdByCompanyId: companyId,
      })
      .returning();
    return entry;
  },

  async adjustOrReversePoints(
    impactRecordId: number,
    companyId: number,
    input: { points: number; type: "ajuste" | "reversion"; note: string }
  ) {
    const [record] = await db.select().from(impactRecords).where(eq(impactRecords.id, impactRecordId));
    if (!record) throw Object.assign(new Error("Registro de impacto no encontrado"), { status: 404 });

    const linked = await this.isProviderLinkedToCompany(record.providerId, companyId);
    if (!linked) throw Object.assign(new Error("Este proveedor no está patrocinado por tu empresa"), { status: 403 });

    const existingGrant = await db
      .select()
      .from(pointsLedger)
      .where(and(eq(pointsLedger.impactRecordId, impactRecordId), eq(pointsLedger.type, "otorgado")));
    if (existingGrant.length === 0) {
      throw Object.assign(new Error("No hay un otorgamiento previo para ajustar o revertir"), { status: 409 });
    }

    const [entry] = await db
      .insert(pointsLedger)
      .values({
        providerId: record.providerId,
        impactRecordId,
        points: input.type === "reversion" ? -Math.abs(input.points) : input.points,
        type: input.type,
        note: input.note,
        createdByCompanyId: companyId,
      })
      .returning();

    await db
      .update(impactRecords)
      .set({ status: input.type === "reversion" ? "revertido" : "ajustado" })
      .where(eq(impactRecords.id, impactRecordId));

    return entry;
  },

  async getCompanyImpactPanel(companyId: number) {
    const links = await db
      .select({
        providerId: providers.id,
        companyName: providers.companyName,
        region: providers.region,
        developmentLevel: providers.developmentLevel,
        plan: providers.plan,
      })
      .from(companyProviderLinks)
      .innerJoin(providers, eq(companyProviderLinks.providerId, providers.id))
      .where(eq(companyProviderLinks.companyId, companyId));

    const withProtection = await Promise.all(
      links.map(async (p) => {
        const policies = await db
          .select()
          .from(insurancePolicies)
          .where(eq(insurancePolicies.providerId, p.providerId));
        return { ...p, hasActiveProtection: policies.some((pol) => pol.status === "activa") };
      })
    );

    const avgDevelopment =
      links.length > 0
        ? Math.round(links.reduce((sum, p) => sum + p.developmentLevel, 0) / links.length)
        : 0;

    return {
      totalProviders: links.length,
      avgDevelopment,
      providers: withProtection,
    };
  },

  async createApplication(data: InsertApplication) {
    const [application] = await db.insert(applications).values(data).returning();
    return application;
  },

  async listCourses() {
    return db.select().from(courses);
  },

  // --- Convocatoria regional: cupos e inscripción con pago ---

  async listComunasConDisponibilidad() {
    const comunas = await db.select().from(convocatoriaComunas);
    const ocupadas = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(inArray(convocatoriaInscripciones.paymentStatus, ["pendiente", "pago_no_habilitado", "en_proceso", "pagado"]));

    return comunas.map((c) => {
      const ocupados = ocupadas.filter((i) => i.comunaId === c.id).length;
      return { ...c, ocupados, disponibles: Math.max(0, c.cupos - ocupados) };
    });
  },

  async createInscripcionConPago(
    input: InsertConvocatoriaInscripcion,
    urls: { urlConfirmation: string; urlReturn: string }
  ) {
    const [comuna] = await db.select().from(convocatoriaComunas).where(eq(convocatoriaComunas.id, input.comunaId));
    if (!comuna) throw Object.assign(new Error("Comuna no encontrada"), { status: 404 });

    const ocupadas = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(
        and(
          eq(convocatoriaInscripciones.comunaId, comuna.id),
          inArray(convocatoriaInscripciones.paymentStatus, ["pendiente", "pago_no_habilitado", "en_proceso", "pagado"])
        )
      );
    if (ocupadas.length >= comuna.cupos) {
      throw Object.assign(new Error("No quedan cupos disponibles en esta comuna"), { status: 409 });
    }

    const commerceOrder = `pr-conv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const [inscripcion] = await db
      .insert(convocatoriaInscripciones)
      .values({
        comunaId: comuna.id,
        companyName: input.companyName,
        rut: input.rut,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        amount: String(INSCRIPTION_FEE_CLP),
        paymentStatus: "pendiente",
        flowCommerceOrder: commerceOrder,
      })
      .returning();

    if (!isFlowConfigured()) {
      const [updated] = await db
        .update(convocatoriaInscripciones)
        .set({ paymentStatus: "pago_no_habilitado" })
        .where(eq(convocatoriaInscripciones.id, inscripcion.id))
        .returning();
      return { inscripcion: updated, redirectUrl: null as string | null };
    }

    const payment = await createPayment({
      commerceOrder,
      subject: `Inscripción convocatoria regional — ${comuna.nombre}`,
      amount: INSCRIPTION_FEE_CLP,
      email: input.contactEmail,
      urlConfirmation: urls.urlConfirmation,
      urlReturn: urls.urlReturn,
    });

    const [updated] = await db
      .update(convocatoriaInscripciones)
      .set({
        paymentStatus: "en_proceso",
        flowToken: payment.token,
        flowFlowOrder: payment.flowOrder,
      })
      .where(eq(convocatoriaInscripciones.id, inscripcion.id))
      .returning();

    return { inscripcion: updated, redirectUrl: payment.redirectUrl };
  },

  async confirmFlowPaymentByToken(token: string) {
    const [inscripcion] = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(eq(convocatoriaInscripciones.flowToken, token));
    if (!inscripcion) throw Object.assign(new Error("Inscripción no encontrada para este token"), { status: 404 });

    const status = await getPaymentStatus(token);
    const map: Record<number, "en_proceso" | "pagado" | "rechazado" | "anulado"> = {
      1: "en_proceso",
      2: "pagado",
      3: "rechazado",
      4: "anulado",
    };
    const paymentStatus = map[status.status] ?? "en_proceso";

    const [updated] = await db
      .update(convocatoriaInscripciones)
      .set({
        paymentStatus,
        flowRawStatus: JSON.stringify(status.raw),
        paidAt: paymentStatus === "pagado" ? new Date() : inscripcion.paidAt,
      })
      .where(eq(convocatoriaInscripciones.id, inscripcion.id))
      .returning();

    return updated;
  },

  async getInscripcionByToken(token: string) {
    const [inscripcion] = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(eq(convocatoriaInscripciones.flowToken, token));
    return inscripcion;
  },

  // --- Administración de la convocatoria: socios fundadores y sorteo Brasil ---

  async listInscripcionesAdmin() {
    return db.select().from(convocatoriaInscripciones).orderBy(desc(convocatoriaInscripciones.createdAt));
  },

  async reviewFounderStatus(inscripcionId: number, input: FounderReviewInput) {
    const [inscripcion] = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(eq(convocatoriaInscripciones.id, inscripcionId));
    if (!inscripcion) throw Object.assign(new Error("Inscripción no encontrada"), { status: 404 });
    if (inscripcion.paymentStatus !== "pagado") {
      throw Object.assign(new Error("Solo se puede confirmar socio fundador con el pago ya confirmado"), { status: 409 });
    }

    const [updated] = await db
      .update(convocatoriaInscripciones)
      .set({
        founderStatus: input.decision,
        founderReviewNote: input.note ?? "",
        founderReviewedAt: new Date(),
      })
      .where(eq(convocatoriaInscripciones.id, inscripcionId))
      .returning();
    return updated;
  },

  async runBrasilTripRaffle() {
    const yaSeleccionados = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(eq(convocatoriaInscripciones.brasilTripSelected, true));

    const cuposRestantes = CUPOS_VIAJE_BRASIL - yaSeleccionados.length;
    if (cuposRestantes <= 0) {
      return { seleccionados: [], mensaje: "Ya se completaron los 50 cupos del sorteo." };
    }

    const elegibles = await db
      .select()
      .from(convocatoriaInscripciones)
      .where(
        and(
          eq(convocatoriaInscripciones.paymentStatus, "pagado"),
          eq(convocatoriaInscripciones.brasilTripSelected, false)
        )
      );

    const ganadores = sortearGanadores(elegibles, cuposRestantes);
    const ganadoresActualizados = [];
    for (const g of ganadores) {
      const [updated] = await db
        .update(convocatoriaInscripciones)
        .set({ brasilTripSelected: true, brasilTripSelectedAt: new Date() })
        .where(eq(convocatoriaInscripciones.id, g.id))
        .returning();
      ganadoresActualizados.push(updated);
    }
    return { seleccionados: ganadoresActualizados, mensaje: `Se sortearon ${ganadoresActualizados.length} cupo(s).` };
  },
};
