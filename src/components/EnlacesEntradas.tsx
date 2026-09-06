"use client";

import { useState } from "react";

import { copiarTexto } from "@/lib/portapapeles";

export type EnlaceEntrada = { id: string; nombre: string; url: string; usado: boolean };

/**
 * Enlaces de las entradas ya emitidas. Van arriba de los comprobantes porque en
 * una compra confirmada el comprobante ya se revisó y lo que el operador
 * necesita es entregar las entradas; abajo de la imagen quedaban fuera de la
 * primera pantalla.
 */
export function EnlacesEntradas({ entradas }: { entradas: EnlaceEntrada[] }) {
  const [copia, setCopia] = useState<{ id: string; estado: "ok" | "error" } | null>(null);

  async function copiar(entrada: EnlaceEntrada) {
    const copiado = await copiarTexto(entrada.url);
    setCopia({ id: entrada.id, estado: copiado ? "ok" : "error" });
    window.setTimeout(() => setCopia(null), copiado ? 2200 : 6000);
  }

  return (
    <section className="mt-6">
      <h2 className="event-label">Entradas emitidas ({entradas.length})</h2>
      <ul className="grid gap-px bg-ink">
        {entradas.map((entrada) => {
          const aviso = copia?.id === entrada.id ? copia.estado : null;
          return (
            <li key={entrada.id} className="bg-white p-3">
              <p className="font-bold">
                {entrada.nombre}
                {entrada.usado && <span className="ml-2 bg-ink px-2 py-0.5 text-xs font-black text-cream uppercase">Ya usada</span>}
              </p>
              <a
                href={entrada.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block [overflow-wrap:anywhere] text-sm font-semibold text-event-blue underline decoration-2 underline-offset-4"
              >
                {entrada.url}
              </a>
              <p className="mt-2">
                <button
                  type="button"
                  onClick={() => void copiar(entrada)}
                  aria-label={`Copiar el enlace de ${entrada.nombre}`}
                  className="text-xs font-black text-event-blue underline underline-offset-4"
                >
                  Copiar enlace
                </button>
                <span role="status" aria-live="polite" className={`ml-2 align-middle text-xs font-black ${aviso === "error" ? "text-event-red" : "text-emerald-700"}`}>
                  {aviso === "ok" ? "¡Copiado!" : aviso === "error" ? "Copia no permitida" : ""}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
