"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useState } from "react";

export type RegistroHoja = {
  id: string;
  nombrePagador: string;
  cantidadPersonas: number;
  montoEsperado: number;
  status: string;
  comprobanteUrl?: string;
  /** Tipos de correo con un fallo sin resolver; vacío si todo salió bien. */
  fallosCorreo?: string[];
};

export function HojaComprobantes({ registros }: { registros: RegistroHoja[] }) {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function confirmar() {
    setEnviando(true);
    setMensaje("");
    const response = await fetch("/api/admin/registros/confirmar-lote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: seleccionados }),
    });
    const body = (await response.json()) as { confirmados?: number; error?: string };
    setEnviando(false);
    if (!response.ok) return setMensaje(body.error ?? "No se pudo confirmar el lote.");
    setSeleccionados([]);
    setMensaje(`${body.confirmados ?? 0} pago(s) confirmado(s).`);
    router.refresh();
  }

  return <section className="mt-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="event-kicker">Revisión manual</p><h2 className="text-2xl font-black uppercase">Hoja de comprobantes</h2><p className="text-sm text-neutral-500">Selecciona únicamente los pagos cuyo monto hayas verificado.</p></div><button onClick={confirmar} disabled={seleccionados.length === 0 || enviando} className="event-button bg-emerald-700">{enviando ? "Confirmando…" : `Confirmar lote (${seleccionados.length})`}</button></div>{mensaje && <p className="event-note mt-3">{mensaje}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{registros.map((registro) => { const marcado = seleccionados.includes(registro.id); return <article key={registro.id} className={`overflow-hidden bg-white shadow-[3px_3px_0_var(--ink)] ${marcado ? "outline-4 outline-emerald-600" : "outline outline-1 outline-ink/10"}`}><label className="block cursor-pointer"><div className="relative aspect-[4/3] bg-neutral-100">{registro.comprobanteUrl ? <img alt={`Comprobante de ${registro.nombrePagador}`} src={registro.comprobanteUrl} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-sm font-bold text-neutral-500 uppercase">Sin imagen</div>}<span className="absolute bottom-2 right-2 bg-ink px-2 py-1 font-black text-event-yellow">S/ {registro.montoEsperado.toFixed(2)}</span></div><div className="flex gap-3 border-t-2 border-dashed border-ink/20 p-3"><input type="checkbox" checked={marcado} disabled={registro.status !== "pendiente"} onChange={(event) => setSeleccionados((actuales) => event.target.checked ? [...actuales, registro.id] : actuales.filter((id) => id !== registro.id))} className="mt-1 h-5 w-5 accent-event-red" /><span><strong className="block [overflow-wrap:anywhere]">{registro.nombrePagador}</strong><span className="text-sm text-neutral-500">{registro.cantidadPersonas} entrada(s) · {registro.status}</span>{registro.fallosCorreo?.length ? <span className="mt-1 block bg-event-red px-2 py-0.5 text-xs font-black text-white uppercase">Correo con problema: {registro.fallosCorreo.join(", ")}</span> : null}</span></div></label><a href={`/admin/registros/${registro.id}`} className="block bg-event-blue px-3 py-2 text-center text-sm font-black text-cream uppercase">Ver detalle</a></article>; })}</div></section>;
}
