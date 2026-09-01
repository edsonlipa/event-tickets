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

  return <section className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Hoja de comprobantes</h2><p className="text-sm text-slate-500">Selecciona únicamente los pagos cuyo monto hayas verificado.</p></div><button onClick={confirmar} disabled={seleccionados.length === 0 || enviando} className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40">{enviando ? "Confirmando…" : `Confirmar lote (${seleccionados.length})`}</button></div>{mensaje && <p className="mt-3 rounded bg-slate-100 p-3 text-sm">{mensaje}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{registros.map((registro) => { const marcado = seleccionados.includes(registro.id); return <article key={registro.id} className={`overflow-hidden rounded-xl border bg-white ${marcado ? "ring-2 ring-emerald-600" : ""}`}><label className="block cursor-pointer"><div className="relative aspect-[4/3] bg-slate-100">{registro.comprobanteUrl ? <img alt={`Comprobante de ${registro.nombrePagador}`} src={registro.comprobanteUrl} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-sm text-slate-500">Sin imagen</div>}<span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 font-bold text-white">S/ {registro.montoEsperado.toFixed(2)}</span></div><div className="flex gap-3 p-3"><input type="checkbox" checked={marcado} disabled={registro.status !== "pendiente"} onChange={(event) => setSeleccionados((actuales) => event.target.checked ? [...actuales, registro.id] : actuales.filter((id) => id !== registro.id))} className="mt-1 h-5 w-5" /><span><strong className="block">{registro.nombrePagador}</strong><span className="text-sm text-slate-500">{registro.cantidadPersonas} entrada(s) · {registro.status}</span></span></div></label><a href={`/admin/registros/${registro.id}`} className="block border-t px-3 py-2 text-center text-sm font-semibold text-violet-700">Ver detalle</a></article>; })}</div></section>;
}
