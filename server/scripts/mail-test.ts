import "dotenv/config";
import { sendMail, verifyMailer } from "../services/mailer";

/**
 * Prueba el servidor de correo configurado en .env.
 * Uso: npm run mail:test -- destino@dominio.cl
 */
async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Uso: npm run mail:test -- destino@dominio.cl");
    process.exit(1);
  }
  console.log(`Conectando a ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} como ${process.env.SMTP_USER ?? "(sin usuario)"}…`);
  await verifyMailer();
  console.log("Conexión y credenciales OK. Enviando correo de prueba…");
  await sendMail({
    to,
    subject: "Prueba de envío — Proveedor Regional",
    text: `Este es un correo de prueba enviado desde el servidor de Proveedor Regional (${process.env.APP_BASE_URL ?? "local"}).\n\nSi llegó a la bandeja de entrada (no a spam), el envío está bien configurado.`,
  });
  console.log(`Enviado a ${to}. Revisa la bandeja de entrada y la carpeta de spam.`);
}

main().catch((e) => {
  console.error("Falló el envío:", e.message);
  process.exit(1);
});
