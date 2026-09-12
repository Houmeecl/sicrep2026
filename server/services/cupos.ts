/**
 * Algoritmo de asignación de cupos de la convocatoria regional.
 *
 * Regla: cada comuna recibe un mínimo garantizado de cupos (para que las comunas más
 * pequeñas no queden casi sin espacio); el resto del total se reparte proporcional a la
 * población de cada comuna. Todo el cálculo es transparente y reproducible — no hay
 * números "mágicos" fijados a mano por comuna.
 *
 * Población: cifras aproximadas (INE, referenciales) — ajustar si se cuenta con datos
 * oficiales más recientes.
 */

export const TOTAL_CUPOS_CONVOCATORIA = 200;
export const MIN_CUPOS_POR_COMUNA = 20;

// TODO: monto definido de forma provisional para poder probar el flujo de pago — el
// negocio debe confirmar el valor final de la inscripción antes de operar en producción.
export const INSCRIPTION_FEE_CLP = 9990;

export interface ComunaPoblacion {
  nombre: string;
  poblacion: number;
}

export const COMUNAS_CONVOCATORIA: ComunaPoblacion[] = [
  { nombre: "Antofagasta", poblacion: 361873 },
  { nombre: "Mejillones", poblacion: 14559 },
  { nombre: "Taltal", poblacion: 12517 },
  { nombre: "San Pedro de Atacama", poblacion: 10996 },
  { nombre: "María Elena", poblacion: 7270 },
];

export interface ComunaCupos extends ComunaPoblacion {
  cupos: number;
}

/**
 * Reparte TOTAL_CUPOS_CONVOCATORIA entre las comunas dadas:
 * 1. Cada comuna recibe MIN_CUPOS_POR_COMUNA.
 * 2. El remanente (total - mínimos) se reparte proporcional a población.
 * 3. Se ajusta el redondeo en la comuna de mayor población para que la suma final
 *    sea exactamente el total (nunca se "pierden" ni se "inventan" cupos por redondeo).
 */
export function calcularCuposPorComuna(
  comunas: ComunaPoblacion[] = COMUNAS_CONVOCATORIA,
  total: number = TOTAL_CUPOS_CONVOCATORIA,
  minimoPorComuna: number = MIN_CUPOS_POR_COMUNA
): ComunaCupos[] {
  const minimosTotales = comunas.length * minimoPorComuna;
  if (minimosTotales > total) {
    throw new Error("El mínimo por comuna multiplicado por el número de comunas supera el total de cupos.");
  }

  const remanente = total - minimosTotales;
  const poblacionTotal = comunas.reduce((sum, c) => sum + c.poblacion, 0);

  const resultado: ComunaCupos[] = comunas.map((c) => ({
    ...c,
    cupos: minimoPorComuna + Math.floor((remanente * c.poblacion) / poblacionTotal),
  }));

  const asignados = resultado.reduce((sum, c) => sum + c.cupos, 0);
  const diferencia = total - asignados;
  if (diferencia !== 0) {
    const mayor = resultado.reduce((max, c) => (c.poblacion > max.poblacion ? c : max), resultado[0]);
    mayor.cupos += diferencia;
  }

  return resultado;
}
