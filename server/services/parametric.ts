/**
 * Lógica de protección paramétrica simulada. En un producto real, esto se
 * integraría con un proveedor de datos (clima, sismos, continuidad
 * operacional) que dispara pagos automáticos al cumplirse un umbral.
 */

export const COVERAGE_TYPES = [
  "Interrupción por clima extremo",
  "Interrupción operacional en faena",
  "Corte prolongado de suministro eléctrico",
] as const;

export function defaultCoverageForPlan(plan: "base" | "desarrollo" | "empresa"): string {
  return plan === "base" ? COVERAGE_TYPES[0] : COVERAGE_TYPES[1];
}
