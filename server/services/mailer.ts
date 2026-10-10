import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envío de correos transaccionales (código de verificación, enlace de seguimiento, tarjeta).
 * Se configura con SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM.
 *
 * Sin SMTP configurado:
 *  - en desarrollo, el correo se imprime en consola (para poder probar el flujo);
 *  - en producción, el envío falla con 503: la verificación de correo es parte del KYC y no
 *    se puede dar por cumplida sin que el correo salga de verdad.
 */

let transporter: Transporter | null = null;

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(input: MailInput): Promise<void> {
  if (!isMailerConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw Object.assign(new Error("El envío de correos no está configurado (SMTP_HOST/MAIL_FROM)"), { status: 503 });
    }
    console.log(`\n[correo DEV — no enviado] Para: ${input.to}\nAsunto: ${input.subject}\n${input.text}\n`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
