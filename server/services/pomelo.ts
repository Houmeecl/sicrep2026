/**
 * Capa de integración con Pomelo (procesador de tarjetas / BaaS).
 *
 * Hoy no existe convenio comercial ni credenciales con Pomelo, así que esta
 * capa simula la emisión y el saldo de la Tarjeta Proveedor Regional en la
 * base de datos local. El día que exista integración real, solo esta
 * interfaz cambia de implementación (issueCard/getBalance pasan a llamar a
 * la API de Pomelo) sin tocar rutas ni componentes de UI.
 */

export interface PomeloCard {
  cardNumberMasked: string;
  pomeloAccountId: string;
}

function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10);
  return out;
}

export function issueCard(): PomeloCard {
  const last4 = randomDigits(4);
  return {
    cardNumberMasked: `•••• •••• •••• ${last4}`,
    pomeloAccountId: `pomelo_sim_${randomDigits(10)}`,
  };
}

export function initialCreditLine(plan: "base" | "desarrollo" | "empresa"): number {
  switch (plan) {
    case "empresa":
      return 5_000_000;
    case "desarrollo":
      return 2_500_000;
    default:
      return 800_000;
  }
}
