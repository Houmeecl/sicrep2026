/**
 * Puntos: incentivos internos del programa Proveedor Regional, no créditos de carbono ni dinero.
 *
 * IMPORTANTE: no existe una equivalencia oficial de puntos por tCO2e. El valor de abajo es
 * únicamente una sugerencia ILUSTRATIVA para prellenar el formulario de otorgamiento en esta
 * demo — quien revisa siempre puede (y debe poder) cambiarlo. Cuando el programa defina una
 * regla oficial, este archivo es el único lugar que debe cambiar.
 */

export const DEMO_POINTS_PER_TCO2E = 10;
export const DEMO_POINTS_RULE_LABEL = "DEMO — regla pendiente de definición oficial";

export function suggestDemoPoints(validatedReductionTco2e: number): number {
  return Math.max(0, Math.round(validatedReductionTco2e * DEMO_POINTS_PER_TCO2E));
}
