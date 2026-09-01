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
  return <form onSubmit={enviar} className="mt-7 space-y-5"><label className="block"><span className="event-label">Correo de la compra</span><input name="email" type="email" required maxLength={254} autoComplete="email" className="event-input" /></label><button disabled={enviando} className="event-button w-full">{enviando ? "Procesando…" : "Reenviar entradas"}</button>{mensaje && <p className="event-note">{mensaje}</p>}</form>;
}
