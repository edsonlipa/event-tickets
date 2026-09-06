/**
 * Enlaces `wa.me` para que el operador mande las entradas por WhatsApp desde el
 * panel. El esquema solo transporta texto —no admite adjuntar el arte ni el PNG
 * del QR—, así que el mensaje lleva el enlace canónico de cada entrada, el mismo
 * que codifica el QR y que abre `/v/[token]` sin consumirla.
 *
 * El módulo no importa nada a propósito: es lógica pura, verificable con
 * `npm run test:whatsapp` sin levantar Next ni Supabase.
 */

const PREFIJO_PERU = "51";

/**
 * Deja el celular en el formato que espera `wa.me`: solo dígitos y con código de
 * país. El formulario de compra acepta texto libre (`999 888 777`, `+51 999...`,
 * `051-999-888-777`), así que aquí se normaliza en vez de exigirlo al comprador.
 * Devuelve `null` cuando no queda un número marcable.
 */
export function normalizarNumeroWhatsapp(celular: string): string | null {
  const digitos = celular.replace(/\D/g, "").replace(/^0+/, "");
  // Nueve dígitos que empiezan en 9 es el único formato local de celular en
  // Perú; a partir de diez, el número ya trae su código de país.
  if (digitos.length === 9 && digitos.startsWith("9")) return PREFIJO_PERU + digitos;
  if (digitos.length >= 10 && digitos.length <= 15) return digitos;
  return null;
}

export type EntradaWhatsapp = { nombre: string | null; url: string };

/**
 * `fechaHora` llega ya formateada por `@/lib/fecha` para no duplicar la zona
 * horaria del evento en un segundo lugar.
 *
 * Cada enlace va solo en su línea, sin texto ni puntuación pegados: es la forma
 * en que WhatsApp los detecta de manera fiable y los vuelve tocables.
 */
export function mensajeEntradasWhatsapp(datos: {
  nombrePagador: string;
  evento: { nombre: string; fechaHora: string; lugar: string | null };
  entradas: EntradaWhatsapp[];
}) {
  const lista = datos.entradas
    .map((entrada, indice) => `${indice + 1}. ${entrada.nombre?.trim() || `Entrada ${indice + 1}`}\n${entrada.url}`)
    .join("\n\n");
  const lugar = datos.evento.lugar ? `\nLugar: ${datos.evento.lugar}` : "";
  return [
    `Hola ${datos.nombrePagador}, confirmamos tu pago para ${datos.evento.nombre}.`,
    datos.entradas.length === 1 ? "Esta es tu entrada:" : `Estas son tus ${datos.entradas.length} entradas:`,
    lista,
    `Fecha y hora: ${datos.evento.fechaHora}${lugar}`,
    "Abre cada enlace y muestra el QR en la puerta. Cada entrada sirve para un solo ingreso.",
  ].join("\n\n");
}

/**
 * `wa.me` sin número abre el selector de contactos con el mensaje ya escrito:
 * es la salida degradada cuando el celular registrado no se puede marcar.
 */
export function enlaceWhatsapp(numero: string | null, mensaje: string) {
  return `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(mensaje)}`;
}
