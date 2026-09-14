import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "./db";
import {
  users,
  executives,
  courses,
  providers,
  companies,
  cardAccounts,
  cardEvents,
  cardTransactions,
  insurancePolicies,
  courseEnrollments,
  advisorySessions,
  companyProviderLinks,
  greenFinancingProjects,
  impactRecords,
  pointsLedger,
  convocatoriaComunas,
} from "@shared/schema";
import { issueCard, initialCreditLine } from "./services/pomelo";
import { suggestDemoPoints } from "./services/points";
import { calcularCuposPorComuna } from "./services/cupos";

async function seed() {
  console.log("Sembrando datos de ejemplo para Proveedor Regional...");

  const [executive] = await db
    .insert(executives)
    .values({
      fullName: "Catalina Rojas",
      title: "Ejecutiva Proveedor Regional",
      email: "catalina.rojas@proveedorregional.com",
    })
    .returning();

  const [course1] = await db
    .insert(courses)
    .values({
      title: "Gestión financiera para pymes",
      category: "Finanzas",
      durationHours: 6,
      description: "Fundamentos de flujo de caja, costeo y financiamiento para proveedores regionales.",
    })
    .returning();

  const [course2] = await db
    .insert(courses)
    .values({
      title: "Seguridad en faena",
      category: "Seguridad",
      durationHours: 8,
      description: "Estándares de seguridad exigidos por grandes mandantes mineros.",
    })
    .returning();

  await db.insert(courses).values([
    { title: "Licitaciones y contratos", category: "Comercial", durationHours: 5, description: "Cómo postular y competir en procesos de licitación." },
    { title: "Gestión de calidad ISO 9001", category: "Calidad", durationHours: 10, description: "Introducción a sistemas de gestión de calidad." },
    { title: "Sostenibilidad y huella de carbono", category: "ESG", durationHours: 6, description: "Medición de huella de carbono para pymes proveedoras." },
  ]);

  const providerPasswordHash = await bcrypt.hash("proveedor123", 10);
  const [providerUser] = await db
    .insert(users)
    .values({
      email: "proveedor@demo.proveedorregional.com",
      passwordHash: providerPasswordHash,
      fullName: "Juan Pérez",
      role: "provider",
    })
    .returning();

  const [provider] = await db
    .insert(providers)
    .values({
      userId: providerUser.id,
      companyName: "Transportes Regionales del Norte SpA",
      rut: "76.123.456-7",
      region: "Antofagasta",
      industry: "Transporte y logística",
      plan: "desarrollo",
      developmentLevel: 60,
      executiveId: executive.id,
    })
    .returning();

  const card = issueCard();
  const [account] = await db
    .insert(cardAccounts)
    .values({
      providerId: provider.id,
      cardNumberMasked: card.cardNumberMasked,
      pomeloAccountId: card.pomeloAccountId,
      balance: "2500000",
      creditLine: String(initialCreditLine(provider.plan)),
      status: "activa",
    })
    .returning();

  await db.insert(insurancePolicies).values({
    providerId: provider.id,
    coverageType: "Interrupción operacional en faena",
    status: "activa",
  });

  await db.insert(cardEvents).values({
    cardAccountId: account.id,
    action: "activar",
    note: "Emisión inicial de la tarjeta (simulada).",
  });

  await db.insert(cardTransactions).values([
    { cardAccountId: account.id, description: "Pago a proveedor de combustible", amount: "-180000" },
    { cardAccountId: account.id, description: "Abono línea de capital de trabajo", amount: "500000" },
  ]);

  await db.insert(courseEnrollments).values([
    { providerId: provider.id, courseId: course1.id, progress: 100, completed: true },
    { providerId: provider.id, courseId: course2.id, progress: 45, completed: false },
  ]);

  await db.insert(advisorySessions).values({
    providerId: provider.id,
    executiveId: executive.id,
    topic: "Asesoría en gestión financiera",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
  });

  const companyPasswordHash = await bcrypt.hash("empresa123", 10);
  const [companyUser] = await db
    .insert(users)
    .values({
      email: "empresa@demo.proveedorregional.com",
      passwordHash: companyPasswordHash,
      fullName: "Ana Muñoz",
      role: "company_admin",
    })
    .returning();

  const [company] = await db
    .insert(companies)
    .values({
      userId: companyUser.id,
      companyName: "Minera Andina S.A.",
      rut: "90.111.222-3",
      sharedBranding: false,
      executiveId: executive.id,
    })
    .returning();

  await db.insert(companyProviderLinks).values({
    companyId: company.id,
    providerId: provider.id,
  });

  const [financingProject] = await db
    .insert(greenFinancingProjects)
    .values({
      providerId: provider.id,
      projectName: "Recambio de flota diésel a eléctrica",
      investmentAmount: "35000000",
      fundsDestination: "Compra de 2 camionetas eléctricas para reparto regional",
      background: "Flota actual con 8 años de antigüedad y alto costo de mantención.",
      status: "postulado",
    })
    .returning();

  // Registro validado y con puntos otorgados: muestra el recorrido completo ya cerrado.
  const [validatedRecord] = await db
    .insert(impactRecords)
    .values({
      providerId: provider.id,
      financingProjectId: financingProject.id,
      baselinePeriod: "2024",
      period: "2025-Q1",
      activity: "Reemplazo parcial de flota diésel por eléctrica",
      consumptionValue: "1200",
      consumptionUnit: "litros diésel evitados",
      emissionFactor: "0.0027",
      factorVersion: "DEMO v1 — pendiente de definición oficial",
      method: "Estimación por combustible evitado (demo).",
      evidenceNotes: "Boletas de compra de vehículo eléctrico y bitácora de uso (demo).",
      estimatedReductionTco2e: String(1200 * 0.0027),
      validatedReductionTco2e: String(3.0),
      status: "validado",
      reviewedByCompanyId: company.id,
      reviewedAt: new Date(),
    })
    .returning();

  await db.insert(pointsLedger).values({
    providerId: provider.id,
    impactRecordId: validatedRecord.id,
    points: suggestDemoPoints(3.0),
    type: "otorgado",
    note: "Otorgamiento demo tras validación de evidencia.",
    createdByCompanyId: company.id,
  });

  // Segundo registro, aún estimado/pendiente: para probar la revisión en vivo desde /empresa.
  await db.insert(impactRecords).values({
    providerId: provider.id,
    financingProjectId: financingProject.id,
    baselinePeriod: "2024",
    period: "2025-Q2",
    activity: "Optimización de rutas de transporte",
    consumptionValue: "300",
    consumptionUnit: "litros diésel evitados",
    emissionFactor: "0.0027",
    factorVersion: "DEMO v1 — pendiente de definición oficial",
    method: "Estimación por combustible evitado (demo).",
    evidenceNotes: "Registro GPS de rutas (demo, pendiente de adjuntar evidencia formal).",
    estimatedReductionTco2e: String(300 * 0.0027),
    status: "estimado",
  });

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@demo.proveedorregional.com",
    passwordHash: adminPasswordHash,
    fullName: "Administración Proveedor Regional",
    role: "admin",
  });

  const comunasConCupos = calcularCuposPorComuna();
  await db.insert(convocatoriaComunas).values(
    comunasConCupos.map((c) => ({ nombre: c.nombre, poblacion: c.poblacion, cupos: c.cupos }))
  );
  console.log("Cupos por comuna:", comunasConCupos.map((c) => `${c.nombre}: ${c.cupos}`).join(", "));

  console.log("Listo. Credenciales de prueba:");
  console.log("  Proveedor: proveedor@demo.proveedorregional.com / proveedor123");
  console.log("  Empresa:   empresa@demo.proveedorregional.com / empresa123");
  console.log("  Admin:     admin@demo.proveedorregional.com / admin123");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
