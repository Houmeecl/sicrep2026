import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Almacenamiento de documentos KYC en disco, FUERA de la carpeta pública del sitio.
 * UPLOAD_DIR define la ruta (en el VPS conviene una ruta fuera del repo, p. ej.
 * /var/lib/sicrep/kyc, para que un `git reset --hard` del despliegue nunca la toque).
 *
 * Cada archivo se guarda con nombre aleatorio y se registra su SHA-256 para poder
 * demostrar después que el documento revisado es el mismo que se subió.
 */

export const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const MAX_DOC_BYTES = 8 * 1024 * 1024;

export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? "uploads/kyc");
}

/** Comprueba la firma real del archivo (no basta con la extensión ni el mime declarado). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  return null;
}

export async function saveDocument(preinscripcionId: number, buf: Buffer) {
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_MIME.has(mime)) {
    throw Object.assign(new Error("Formato no permitido: sube un PDF, JPG o PNG"), { status: 400 });
  }
  if (buf.length > MAX_DOC_BYTES) {
    throw Object.assign(new Error("El archivo supera 8 MB"), { status: 400 });
  }
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const dir = path.join(uploadDir(), String(preinscripcionId));
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `${crypto.randomBytes(16).toString("hex")}.${ext}`);
  await fs.promises.writeFile(file, buf, { mode: 0o600 });
  return { storagePath: file, sha256, mimeType: mime, bytes: buf.length };
}

/** Evita que una ruta guardada en la base apunte fuera del directorio de documentos. */
export function resolveStoredPath(storagePath: string): string {
  const resolved = path.resolve(storagePath);
  if (!resolved.startsWith(uploadDir() + path.sep)) {
    throw Object.assign(new Error("Ruta de documento inválida"), { status: 400 });
  }
  return resolved;
}
