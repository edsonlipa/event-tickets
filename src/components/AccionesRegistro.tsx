"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AccionesRegistro({ id, status, emailError }: { id: string; status: string; emailError?: string | null }) {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  async function ejecutar(url: string, body?: object) {
    setEnviando(true); setMensaje("");
    const response = await fetch(url, { method: "POST", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = (await response.json()) as { error?: string };
    setEnviando(false);
    if (!response.ok) return setMensaje(result.error ?? "No se pudo completar la acción.");
    router.refresh();
  }
  function rechazar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motivo = String(new FormData(event.currentTarget).get("motivo") ?? "");
    void ejecutar(`/api/admin/registros/${id}/rechazar`, { motivo });
  }
  if (status === "pagado") return <div className="space-y-3"><p className="rounded bg-emerald-50 p-4 text-sm text-emerald-800">Pago confirmado.</p>{emailError && <p className="rounded bg-red-50 p-4 text-sm text-red-800">Error de correo: {emailError}</p>}<button disabled={enviando} onClick={() => void ejecutar(`/api/admin/registros/${id}/reenviar`)} className="w-full rounded bg-violet-700 p-3 font-semibold text-white disabled:opacity-50">Reenviar correo</button>{mensaje && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}</div>;
  if (status !== "pendiente") return <p className="rounded bg-slate-100 p-4 text-sm">Este registro ya está {status}.</p>;
  return <div className="space-y-4"><button disabled={enviando} onClick={() => void ejecutar(`/api/admin/registros/${id}/confirmar`)} className="w-full rounded bg-emerald-700 p-3 font-semibold text-white disabled:opacity-50">Confirmar pago</button><form onSubmit={rechazar} className="space-y-2"><label className="block font-semibold">Motivo de rechazo<textarea name="motivo" required minLength={3} maxLength={500} className="mt-1 min-h-24 w-full rounded border p-3" /></label><button disabled={enviando} className="w-full rounded border border-red-600 p-3 font-semibold text-red-700 disabled:opacity-50">Rechazar</button></form>{mensaje && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{mensaje}</p>}</div>;
}
