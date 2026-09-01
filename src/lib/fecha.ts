export function formatearFecha(fecha: string | Date) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(fecha));
}

export function inicioDiaLimaUtc(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((parte) => parte.type === tipo)?.value);
  return new Date(Date.UTC(valor("year"), valor("month") - 1, valor("day"), 5)).toISOString();
}
