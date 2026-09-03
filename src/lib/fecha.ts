export const ZONA_HORARIA_PERU = "America/Lima";

function fechaValida(fecha: string | Date) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) throw new RangeError("Fecha inválida.");
  return valor;
}

export function formatearFecha(fecha: string | Date) {
  const partes = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: ZONA_HORARIA_PERU,
  }).formatToParts(fechaValida(fecha));
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${obtener("day")} de ${obtener("month")} ${obtener("year")}`;
}

export function formatearHora(fecha: string | Date) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONA_HORARIA_PERU,
  }).format(fechaValida(fecha));
}

export function formatearFechaHora(fecha: string | Date) {
  return `${formatearFecha(fecha)}, ${formatearHora(fecha)}`;
}

export function formatearFechaCsv(fecha: string | Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: ZONA_HORARIA_PERU,
  }).formatToParts(fechaValida(fecha));
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${obtener("year")}-${obtener("month")}-${obtener("day")} ${obtener("hour")}:${obtener("minute")}:${obtener("second")}`;
}
