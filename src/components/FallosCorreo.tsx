import { etiquetaTipo, type FalloCorreo } from "@/lib/fallo-correo";
import { formatearFechaHora } from "@/lib/fecha";

// Distingue lo temporal de lo permanente: el operador solo necesita saber si
// esperar el reintento del cron o levantar el teléfono.
export function FallosCorreo({ fallos }: { fallos: FalloCorreo[] }) {
  if (fallos.length === 0) return null;

  return (
    <section className="mt-4 space-y-3">
      {fallos.map((fallo) => (
        <div
          key={fallo.tipo}
          className={`border-l-8 bg-white p-4 ${fallo.temporal ? "border-event-yellow" : "border-event-red"}`}
        >
          <p className="event-label">
            {etiquetaTipo(fallo.tipo)} · {fallo.temporal ? "temporal" : "requiere acción"}
          </p>
          <p className="mt-1 font-black">{fallo.causa}</p>
          <p className="mt-1 text-sm text-neutral-700">{fallo.queHacer}</p>
          {fallo.intentoAt && (
            <p className="mt-2 text-xs text-neutral-500">Último intento: {formatearFechaHora(fallo.intentoAt)}</p>
          )}
          {fallo.detalle && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-bold text-event-blue">Ver detalle técnico</summary>
              <p className="mt-1 [overflow-wrap:anywhere] bg-cream p-2 font-mono text-xs text-neutral-700">{fallo.detalle}</p>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}
