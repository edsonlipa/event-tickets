"use client";

import { FormEvent, useState } from "react";

export function FormularioReenvio() {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEnviando(true);
    const email = new FormData(event.currentTarget).get("email");
    const response = await fetch("/api/reenviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const body = (await response.json()) as { mensaje: string };
    setMensaje(body.mensaje); setEnviando(false);
  }
  return <form onSubmit={enviar} className="mt-6 space-y-4"><label className="block">Correo de la compra<input name="email" type="email" required maxLength={254} className="mt-1 w-full rounded border p-3" /></label><button disabled={enviando} className="w-full rounded bg-violet-700 p-3 font-semibold text-white disabled:opacity-50">{enviando ? "Procesando…" : "Reenviar entradas"}</button>{mensaje && <p className="rounded bg-violet-50 p-4 text-violet-900">{mensaje}</p>}</form>;
}
