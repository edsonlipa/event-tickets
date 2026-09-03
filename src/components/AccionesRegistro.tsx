"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createPortal } from "react-dom";

type Propiedades = {
  id: string;
  status: string;
  cantidadPersonas: number;
  emailError?: string | null;
};

export function AccionesRegistro({ id, status, cantidadPersonas, emailError }: Propiedades) {
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
        {emailError && <p className="border-l-8 border-event-red bg-red-50 p-4 text-sm text-red-800">Error de correo: {emailError}</p>}

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
