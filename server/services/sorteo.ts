/**
 * Sorteo del impulso a viaje de negocios a Brasil: 50 cupos entre las empresas inscritas
 * con pago confirmado en la convocatoria regional.
 *
 * Selección aleatoria (Fisher-Yates) sobre el conjunto de elegibles que se le entregue —
 * no pondera por comuna, monto ni ningún otro criterio. Quien llama a esta función decide
 * qué conjunto es "elegible" (normalmente: pago confirmado y aún no seleccionado antes).
 */

export const CUPOS_VIAJE_BRASIL = 50;

export function sortearGanadores<T>(elegibles: T[], cupos: number = CUPOS_VIAJE_BRASIL): T[] {
  const copia = [...elegibles];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, Math.max(0, cupos));
}
