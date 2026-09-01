"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginPuerta() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEnviando(true); setError("");
    const pin = new FormData(event.currentTarget).get("pin");
    const response = await fetch("/api/puerta/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) { setEnviando(false); setError(body.error ?? "No se pudo ingresar."); return; }
    const sesion = await fetch("/api/puerta/precarga", { cache: "no-store" });
    if (!sesion.ok) {
      setEnviando(false);
      setError("El navegador no pudo guardar la sesión. Recarga e inténtalo nuevamente.");
      return;
    }
    router.replace("/puerta/escaner");
    router.refresh();
  }
  return <form suppressHydrationWarning onSubmit={enviar} className="mt-7 space-y-5"><label className="block"><span className="event-label">PIN</span><input suppressHydrationWarning name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required autoComplete="off" className="w-full border-2 border-ink bg-cream p-4 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-event-red" /></label>{error && <p role="alert" className="border-l-4 border-event-red bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}<button disabled={enviando} className="event-button-dark w-full">{enviando ? "Validando…" : "Entrar a puerta"}</button></form>;
}
