import fs from "fs";
import path from "path";

/** Carpeta con las imágenes de los pases (derivadas del logo oficial de Proveedor Regional). */
export function walletAssetsDir(): string {
  return path.resolve(process.env.WALLET_ASSETS_DIR ?? path.join(process.cwd(), "server", "wallet-assets"));
}

export function readWalletAsset(name: string): Buffer {
  return fs.readFileSync(path.join(walletAssetsDir(), name));
}

/** Acepta el PEM en línea (empieza con -----BEGIN) o una ruta a un archivo .pem. */
export function readPem(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (v.startsWith("-----BEGIN")) return v.replace(/\\n/g, "\n");
  return fs.readFileSync(path.resolve(v), "utf8");
}
