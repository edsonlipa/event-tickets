import "server-only";

/**
 * URL canónica de una entrada. Vive fuera de `@/lib/qr` porque ese módulo carga
 * `sharp` —un binario nativo— para componer el arte, y hay consumidores, como el
 * detalle del panel, que solo necesitan la cadena.
 *
 * Es exactamente lo que codifica el QR impreso: cambiar este formato invalidaría
 * los códigos ya emitidos.
 */
function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!value) throw new Error("Falta NEXT_PUBLIC_SITE_URL.");
  return value;
}

export function urlEntrada(id: string) {
  return `${siteUrl()}/v/${id}`;
}
