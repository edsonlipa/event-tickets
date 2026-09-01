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
    router.replace("/puerta/escaner"); router.refresh();
  }
  return <form onSubmit={enviar} className="mt-6 space-y-4"><label className="block">PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required autoComplete="off" className="mt-1 w-full rounded border p-4 text-center text-2xl tracking-[0.4em]" /></label>{error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<button disabled={enviando} className="w-full rounded bg-slate-900 p-4 font-semibold text-white disabled:opacity-50">{enviando ? "Validando…" : "Entrar a puerta"}</button></form>;
}
