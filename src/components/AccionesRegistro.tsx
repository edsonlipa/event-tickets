"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";

type Propiedades = {
  id: string;
  status: string;
  cantidadPersonas: number;
  /** Enlace `wa.me` ya armado en el servidor; `null` si la compra no tiene entradas. */
  whatsapp?: string | null;
  /** Número normalizado al que abrirá el chat, para que el operador lo confirme. */
  numeroWhatsapp?: string | null;
};

export function AccionesRegistro({ id, status, cantidadPersonas, whatsapp, numeroWhatsapp }: Propiedades) {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const router = useRouter();

  async function ejecutar(url: string, options: { method?: "POST" | "PATCH"; body?: object } = {}) {
    setEnviando(true);
    setMensaje("");
    const response = await fetch(url, {
      method: options.method ?? "POST",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const result = (await response.json()) as { error?: string };
    setEnviando(false);
    if (!response.ok) {
      setMensaje(result.error ?? "No se pudo completar la acción.");
      return false;
    }
    router.refresh();
    return true;
  }

  function rechazar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = String(new FormData(event.currentTarget).get("motivo") ?? "");
    void ejecutar(`/api/admin/registros/${id}/rechazar`, { body: { motivo } });
  }

  async function ajustar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cantidad = Number(new FormData(event.currentTarget).get("cantidadPersonas"));
    if (await ejecutar(`/api/admin/registros/${id}`, { method: "PATCH", body: { cantidadPersonas: cantidad } })) {
      setEditandoCantidad(false);
    }
  }

  if (status === "pagado") {
    return (
      <div className="space-y-4 bg-white p-4 shadow-[3px_3px_0_var(--ink)]">
        <p className="border-l-8 border-emerald-600 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Pago confirmado.</p>

        <button type="button" disabled={enviando} onClick={() => { setMensaje(""); setEditandoCantidad(true); }} className="event-button-outline w-full">
          Modificar número de entradas
        </button>

        {editandoCantidad && createPortal(
          <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto overscroll-contain bg-ink/75 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-top:max(1rem,env(safe-area-inset-top))]" role="presentation" onKeyDown={(event) => { if (event.key === "Escape" && !enviando) setEditandoCantidad(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="titulo-modificar-entradas" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto bg-white p-5 text-left text-ink shadow-brutal">
              <button type="button" aria-label="Cerrar" disabled={enviando} onClick={() => { setMensaje(""); setEditandoCantidad(false); }} className="absolute right-3 top-3 grid h-10 w-10 place-items-center border-2 border-ink bg-white text-xl font-black">×</button>
              <p className="event-kicker">Compra confirmada</p>
              <h2 id="titulo-modificar-entradas" className="event-title mt-2 pr-10 text-2xl">Modificar número de entradas</h2>
              <div className="mt-4 bg-cream p-4">
                <span className="event-label">Cantidad actual</span>
                <strong className="text-2xl">{cantidadPersonas}</strong>
              </div>
              <p className="mt-4 text-sm text-neutral-600">
                Usa esta opción solo para corregir una compra ya confirmada. Al aumentar se generan QR nuevos; al reducir se anulan únicamente QR que todavía no fueron usados. Después de guardar, reenvía el correo al comprador.
              </p>
              <form onSubmit={(event) => void ajustar(event)} className="mt-5 space-y-4 border-t-2 border-dashed border-ink/20 pt-5">
                <label className="block">
                  <span className="event-label">Nueva cantidad de entradas</span>
                  <input autoFocus name="cantidadPersonas" type="number" min={1} max={20} required defaultValue={cantidadPersonas} className="event-input" />
                </label>
                {mensaje && <p className="border-l-4 border-event-red bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={enviando} onClick={() => { setMensaje(""); setEditandoCantidad(false); }} className="event-button-outline w-full">Cancelar</button>
                  <button disabled={enviando} className="event-button-dark w-full">Guardar cambios</button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}

        <button disabled={enviando} onClick={() => void ejecutar(`/api/admin/registros/${id}/reenviar`)} className="event-button w-full bg-event-blue">Reenviar correo</button>

        {whatsapp && (
          <div className="space-y-2 border-t-2 border-dashed border-ink/20 pt-4">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="event-button w-full gap-2 bg-emerald-700">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 0 16.47Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.19-.54.06-.25-.12-1.05-.38-1.99-1.23-.74-.65-1.23-1.46-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.09-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.16 1.73 2.64 4.2 3.7.59.26 1.04.41 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z"/></svg>
              Enviar por WhatsApp
            </a>
            <p className="text-xs text-neutral-600">
              {numeroWhatsapp
                ? `Abre el chat con +${numeroWhatsapp} y el mensaje ya escrito con el enlace de cada entrada. WhatsApp no permite adjuntar la imagen desde un enlace.`
                : "El celular registrado no es un número marcable: WhatsApp abrirá el mensaje para que elijas el contacto."}
            </p>
          </div>
        )}
        {mensaje && !editandoCantidad && <p className="border-l-4 border-event-red bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}
      </div>
    );
  }

  if (status !== "pendiente") return <p className="event-note">Este registro ya está {status}.</p>;

  return (
    <div className="space-y-4 bg-white p-4 shadow-[3px_3px_0_var(--ink)]">
      <button disabled={enviando} onClick={() => void ejecutar(`/api/admin/registros/${id}/confirmar`)} className="event-button w-full bg-emerald-700">Confirmar pago</button>
      <form onSubmit={rechazar} className="space-y-3 border-t-2 border-dashed border-ink/20 pt-4">
        <label className="block">
          <span className="event-label">Motivo de rechazo</span>
          <textarea name="motivo" required minLength={3} maxLength={500} className="min-h-24 w-full border-2 border-ink bg-cream p-3 outline-none focus:border-event-red" />
        </label>
        <p className="border-l-4 border-event-yellow bg-cream p-3 text-xs text-neutral-700">Este texto se le enviará al comprador por correo, junto con el enlace para registrar su compra de nuevo.</p>
        <button disabled={enviando} className="event-button-outline w-full border-event-red text-red-700">Rechazar</button>
      </form>
      {mensaje && <p className="border-l-4 border-event-red bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}
    </div>
  );
}
