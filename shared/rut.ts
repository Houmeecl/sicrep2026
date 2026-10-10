/**
 * Utilidades de RUT chileno, compartidas por cliente y servidor.
 * La validación es solo aritmética (dígito verificador módulo 11): confirma que el RUT
 * está bien formado, NO que la empresa exista o esté activa ante el SII. Eso último se
 * acredita con documentos y revisión manual (ver server/services/preinscripcion.ts).
 */

export function cleanRut(rut: string): string {
  // Se quitan los ceros a la izquierda: "07.123.456-8" y "7.123.456-8" son el mismo RUT.
  return rut.replace(/[^0-9kK]/g, "").toUpperCase().replace(/^0+/, "");
}

export function computeDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}

export function isValidRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  // Cuerpo de 1 a 8 dígitos sin ceros a la izquierda: una sola escritura canónica por RUT.
  if (!/^[1-9]\d{0,7}$/.test(body)) return false;
  return computeDv(body) === dv;
}

/** Formato canónico para guardar y comparar: "76123456-7". */
export function normalizeRut(rut: string): string {
  const clean = cleanRut(rut);
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

/** Formato de lectura: "76.123.456-7". */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}

/** Para mostrar en páginas públicas sin exponer el RUT completo: "76.***.**6-7". */
export function maskRut(rut: string): string {
  const f = formatRut(rut);
  const [body, dv] = f.split("-");
  if (!body) return f;
  const first = body.slice(0, 2);
  const last = body.slice(-1);
  const middle = body.slice(2, -1).replace(/\d/g, "*");
  return `${first}${middle}${last}-${dv}`;
}

/** Personas jurídicas en Chile tienen RUT desde 50.000.000. */
export function isCompanyRut(rut: string): boolean {
  const body = Number(cleanRut(rut).slice(0, -1));
  return body >= 50_000_000;
}
