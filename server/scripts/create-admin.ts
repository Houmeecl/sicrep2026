import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { users } from "@shared/schema";

/**
 * Crea (o promueve) un usuario administrador para revisar preinscripciones.
 * Uso: npm run admin:create -- correo@dominio.cl "Nombre Apellido"
 * La contraseña se lee de ADMIN_PASSWORD (no se pasa por argumento para que no quede en el historial).
 */
async function main() {
  const [email, fullName] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !fullName || !password || password.length < 12) {
    console.error('Uso: ADMIN_PASSWORD="(12+ caracteres)" npm run admin:create -- correo@dominio.cl "Nombre Apellido"');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing) {
    await db.update(users).set({ role: "admin", passwordHash, fullName }).where(eq(users.id, existing.id));
    console.log(`Usuario ${email} actualizado como administrador.`);
  } else {
    await db.insert(users).values({ email: email.toLowerCase(), passwordHash, fullName, role: "admin" });
    console.log(`Administrador ${email} creado.`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
