import { PKPass } from "passkit-generator";
import type { Preinscripcion } from "@shared/schema";
import { formatRut } from "@shared/rut";
import { readPem, readWalletAsset } from "./assets";
import { verificationUrl } from "../memberCard";

/**
 * Pase de Apple Wallet (.pkpass, tipo storeCard) firmado con el certificado Pass Type ID.
 *
 * Variables necesarias (se obtienen en developer.apple.com → Certificates, IDs & Profiles):
 *   APPLE_PASS_TYPE_ID          p. ej. pass.cl.sicr3p.membresia
 *   APPLE_TEAM_ID               Team ID de la cuenta Apple Developer
 *   APPLE_WWDR_PEM              certificado intermedio Apple WWDR G4 (PEM en línea o ruta)
 *   APPLE_SIGNER_CERT_PEM       certificado del Pass Type ID (PEM o ruta)
 *   APPLE_SIGNER_KEY_PEM        clave privada del certificado (PEM o ruta)
 *   APPLE_SIGNER_KEY_PASSPHRASE contraseña de la clave, si tiene
 *
 * Sin ellas el botón de Apple Wallet no se ofrece: no se genera un pase sin firmar ni uno
 * de prueba, porque iPhone lo rechazaría y daría una falsa impresión de tarjeta emitida.
 */

export function isAppleWalletConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_WWDR_PEM &&
      process.env.APPLE_SIGNER_CERT_PEM &&
      process.env.APPLE_SIGNER_KEY_PEM
  );
}

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago" }).format(d);

export async function buildApplePass(p: Preinscripcion): Promise<Buffer> {
  if (!isAppleWalletConfigured()) {
    throw Object.assign(new Error("Apple Wallet no está configurado en el servidor"), { status: 503 });
  }
  if (p.cardStatus !== "vigente" || !p.memberCode || !p.cardSerial || !p.cardValidaHasta) {
    throw Object.assign(new Error("La tarjeta aún no está emitida"), { status: 409 });
  }

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
    teamIdentifier: process.env.APPLE_TEAM_ID,
    organizationName: "Proveedor Regional",
    description: "Tarjeta de membresía Proveedor Regional (preinscripción)",
    logoText: "Proveedor Regional",
    backgroundColor: "rgb(255, 255, 255)",
    foregroundColor: "rgb(30, 40, 118)",
    labelColor: "rgb(196, 78, 24)",
    sharingProhibited: true,
    storeCard: {
      headerFields: [],
      primaryFields: [],
      secondaryFields: [],
      auxiliaryFields: [],
      backFields: [],
    },
  };

  const pass = new PKPass(
    {
      "pass.json": Buffer.from(JSON.stringify(passJson)),
      "icon.png": readWalletAsset("icon.png"),
      "icon@2x.png": readWalletAsset("icon@2x.png"),
      "icon@3x.png": readWalletAsset("icon@3x.png"),
      "logo.png": readWalletAsset("logo.png"),
      "logo@2x.png": readWalletAsset("logo@2x.png"),
      "logo@3x.png": readWalletAsset("logo@3x.png"),
    },
    {
      wwdr: readPem(process.env.APPLE_WWDR_PEM)!,
      signerCert: readPem(process.env.APPLE_SIGNER_CERT_PEM)!,
      signerKey: readPem(process.env.APPLE_SIGNER_KEY_PEM)!,
      signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE,
    },
    { serialNumber: p.cardSerial }
  );

  pass.headerFields.push({ key: "estado", label: "ESTADO", value: "Preinscripción" });
  pass.primaryFields.push({ key: "titular", label: "TITULAR", value: p.razonSocial });
  pass.secondaryFields.push(
    { key: "socio", label: "CÓDIGO DE SOCIO", value: p.memberCode },
    { key: "rut", label: "RUT", value: formatRut(p.rut) }
  );
  pass.auxiliaryFields.push(
    { key: "vigencia", label: "VÁLIDA HASTA", value: fmtDate(p.cardValidaHasta) },
    { key: "comuna", label: "COMUNA", value: p.comuna }
  );
  pass.backFields.push(
    { key: "folio", label: "Folio de preinscripción", value: p.folio },
    { key: "representante", label: "Representante", value: p.repNombre },
    {
      key: "validez",
      label: "Validez",
      value:
        "Esta tarjeta acredita la preinscripción pagada y con identidad verificada. Su estado vigente se comprueba escaneando el código QR. Es personal e intransferible.",
    },
    { key: "verificar", label: "Verificar", value: verificationUrl(p.memberCode) },
    { key: "soporte", label: "Soporte", value: "soporte@sicr3p.cl · www.sicr3p.cl" }
  );

  pass.setBarcodes({
    message: verificationUrl(p.memberCode),
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: p.memberCode,
  });
  pass.setExpirationDate(p.cardValidaHasta);

  return pass.getAsBuffer();
}
