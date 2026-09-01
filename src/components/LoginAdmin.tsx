"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginAdmin() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setEnviando(false);
      setError(body.error ?? "No pudimos iniciar sesión.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }
  return <form onSubmit={enviar} className="mt-7 space-y-5"><label className="block"><span className="event-label">Correo</span><input name="email" type="email" required autoComplete="username" className="event-input" /></label><label className="block"><span className="event-label">Contraseña</span><input name="password" type="password" required minLength={6} autoComplete="current-password" className="event-input" /></label>{error && <p role="alert" className="border-l-4 border-event-red bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}<button disabled={enviando} className="event-button w-full">{enviando ? "Ingresando…" : "Ingresar"}</button></form>;
}
