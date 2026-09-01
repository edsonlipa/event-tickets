import "server-only";

import QRCode from "qrcode";

function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!value) throw new Error("Falta NEXT_PUBLIC_SITE_URL.");
  return value;
}

export function urlEntrada(id: string) {
  return `${siteUrl()}/v/${id}`;
}

export function generarQrEntrada(id: string) {
  return QRCode.toBuffer(urlEntrada(id), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 480,
  });
}
