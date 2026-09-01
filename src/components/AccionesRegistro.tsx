"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AccionesRegistro({ id, status, cantidadPersonas, emailError }: { id: string; status: string; cantidadPersonas: number; emailError?: string | null }) {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function ejecutar(url: string, options: { method?: "POST" | "PATCH"; body?: object } = {}) {
    setEnviando(true);
    setMensaje("");
    const response = await fetch(url, { method: options.method ?? "POST", headers: options.body ? { "content-type": "application/json" } : undefined, body: options.body ? JSON.stringify(options.body) : undefined });
    const result = (await response.json()) as { error?: string };
    setEnviando(false);
    if (!response.ok) return setMensaje(result.error ?? "No se pudo completar la acción.");
    router.refresh();
  }

  function rechazar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = String(new FormData(event.currentTarget).get("motivo") ?? "");
    void ejecutar(`/api/admin/registros/${id}/rechazar`, { body: { motivo } });
  }

  function ajustar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cantidad = Number(new FormData(event.currentTarget).get("cantidadPersonas"));
    void ejecutar(`/api/admin/registros/${id}`, { method: "PATCH", body: { cantidadPersonas: cantidad } });
  }

  if (status === "pagado") return <div className="space-y-4 bg-white p-4 shadow-[3px_3px_0_var(--ink)]"><p className="border-l-8 border-emerald-600 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Pago confirmado.</p>{emailError && <p className="border-l-8 border-event-red bg-red-50 p-4 text-sm text-red-800">Error de correo: {emailError}</p>}<form onSubmit={ajustar} className="space-y-3 border-2 border-ink p-4"><label className="block"><span className="event-label">Cantidad de entradas</span><input name="cantidadPersonas" type="number" min={1} max={20} required defaultValue={cantidadPersonas} className="event-input" /></label><p className="text-xs text-neutral-600">Al reducir se anulan QR no usados; al aumentar se generan QR nuevos.</p><button disabled={enviando} className="event-button-dark w-full">Guardar cantidad</button></form><button disabled={enviando} onClick={() => void ejecutar(`/api/admin/registros/${id}/reenviar`)} className="event-button w-full bg-event-blue">Reenviar correo</button>{mensaje && <p className="border-l-4 border-event-red bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}</div>;
  if (status !== "pendiente") return <p className="event-note">Este registro ya está {status}.</p>;
  return <div className="space-y-4 bg-white p-4 shadow-[3px_3px_0_var(--ink)]"><button disabled={enviando} onClick={() => void ejecutar(`/api/admin/registros/${id}/confirmar`)} className="event-button w-full bg-emerald-700">Confirmar pago</button><form onSubmit={rechazar} className="space-y-3 border-t-2 border-dashed border-ink/20 pt-4"><label className="block"><span className="event-label">Motivo de rechazo</span><textarea name="motivo" required minLength={3} maxLength={500} className="min-h-24 w-full border-2 border-ink bg-cream p-3 outline-none focus:border-event-red" /></label><button disabled={enviando} className="event-button-outline w-full border-event-red text-red-700">Rechazar</button></form>{mensaje && <p className="border-l-4 border-event-red bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}</div>;
}
