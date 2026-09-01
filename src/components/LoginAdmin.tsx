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
  return <form onSubmit={enviar} className="mt-6 space-y-4"><label className="block">Correo<input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded border p-3" /></label><label className="block">Contraseña<input name="password" type="password" required minLength={6} autoComplete="current-password" className="mt-1 w-full rounded border p-3" /></label>{error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<button disabled={enviando} className="w-full rounded bg-violet-700 p-3 font-semibold text-white disabled:opacity-60">{enviando ? "Ingresando…" : "Ingresar"}</button></form>;
}
