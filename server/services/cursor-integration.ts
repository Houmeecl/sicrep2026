/**
 * Interfaz de integración con el módulo externo de emisión/administración de tarjetas
 * mencionado por el usuario ("Cursor").
 *
 * Estado actual: el código de ese módulo NO ha sido identificado ni revisado por este
 * equipo. Esta interfaz solo documenta el contrato esperado para el día en que exista una
 * integración real — NINGUNA implementación está conectada todavía. No afirmar en ninguna
 * parte de la UI ni de este código que "Cursor" está integrado.
 *
 * Mientras tanto, la emisión y administración de tarjetas sigue usando la simulación local
 * en server/services/pomelo.ts (ver también server/storage.ts).
 */

export interface CursorCardIntegration {
  requestCardIssuance(providerId: number): Promise<{ externalCardId: string; maskedNumber: string }>;
  getCardStatus(externalCardId: string): Promise<"activa" | "bloqueada" | "pendiente">;
  setCardStatus(externalCardId: string, status: "activa" | "bloqueada"): Promise<void>;
  getTransactions(externalCardId: string): Promise<Array<{ description: string; amount: number; date: string }>>;
}

// Sin implementación real conectada. Cuando el módulo Cursor esté identificado y revisado,
// se debe crear una clase que implemente CursorCardIntegration y sustituir gradualmente las
// llamadas a pomelo.ts en server/storage.ts.
export const cursorIntegration: CursorCardIntegration | null = null;
