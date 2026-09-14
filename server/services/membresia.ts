/**
 * Membresía Proveedor Regional: cuota de acceso al programa (landing /membresia).
 *
 * IMPORTANTE: este monto se cobra como transacción única a través de Flow, igual que la
 * convocatoria regional. NO existe cobro recurrente/automático — una renovación mensual o
 * anual real requeriría una integración de suscripciones aparte (no implementada).
 */

// TODO: monto provisional para poder probar el flujo de pago — confirmar el valor
// definitivo (y si será mensual, anual, o único) antes de operar en producción.
export const MEMBERSHIP_FEE_CLP = 9990;
