import "server-only";

import { join } from "node:path";

import sharp from "sharp";
import QRCode from "qrcode";

import { urlEntrada } from "@/lib/entrada-url";

// Se reexporta para no obligar a `mail.ts`, que ya necesita `sharp`, a importar
// de dos módulos distintos.
export { urlEntrada };

export function generarQrEntrada(id: string) {
  return QRCode.toBuffer(urlEntrada(id), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
  });
}

export async function generarQrEntradaDataUrl(id: string) {
  const png = await generarQrEntrada(id);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// Marco oficial `Oficial redes`, exportado del PDF y versionado en public/.
// El recuadro blanco del QR mide 429x416 px a partir de (93, 444) sobre un
// lienzo de 621x1080. El QR se dibuja al 88% del lado menor para conservar
// dentro del recuadro la zona de silencio que el escáner necesita.
const MARCO = { ruta: "entrada-marco.png", qr: 366, left: 125, top: 469 } as const;

export async function generarEntradaArte(id: string) {
  const qr = await QRCode.toBuffer(urlEntrada(id), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 0,
    width: MARCO.qr,
  });
  return sharp(join(process.cwd(), "public", MARCO.ruta))
    .composite([{ input: qr, top: MARCO.top, left: MARCO.left }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

export async function generarEntradaArteDataUrl(id: string) {
  const png = await generarEntradaArte(id);
  return `data:image/png;base64,${png.toString("base64")}`;
}
