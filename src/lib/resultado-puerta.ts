import { formatearHora } from "@/lib/fecha";

export type ResultadoPuerta = {
  resultado: "admitido" | "ya_usado" | "anulada" | "no_existe";
  nombre_persona?: string | null;
  ingreso_at?: string | null;
};

export function presentarResultadoPuerta(resultado: ResultadoPuerta) {
  const admitido = resultado.resultado === "admitido";
  const motivo = resultado.resultado === "ya_usado"
    ? "Entrada ya utilizada"
    : resultado.resultado === "anulada"
      ? "Entrada anulada"
      : resultado.resultado === "no_existe"
        ? "Entrada no válida"
        : null;
  return {
    admitido,
    titulo: admitido ? "PASA" : "NO PASA",
    nombre: resultado.nombre_persona ?? null,
    motivo,
    hora: resultado.ingreso_at ? `Ingreso registrado a las ${formatearHora(resultado.ingreso_at)}` : null,
  };
}
