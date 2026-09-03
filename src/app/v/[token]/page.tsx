import Image from "next/image";

import { PieDePagina } from "@/components/PieDePagina";
import { getDb } from "@/lib/db";
import { formatearFecha, formatearHora } from "@/lib/fecha";
import { generarEntradaArteDataUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function EntradaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [{ data: entrada }, { data: evento }] = await Promise.all([
    db.from("entradas").select("id,nombre_persona,anulada,usado").eq("id", token).maybeSingle(),
    db.from("evento").select("nombre,fecha,lugar").maybeSingle(),
  ]);

  if (!entrada || !evento) {
    return <main className="event-shell grid place-items-center text-center"><section className="event-panel w-full max-w-md border-t-8 border-event-red"><p className="event-kicker">Código inválido</p><h1 className="event-title mt-2">Entrada no encontrada</h1><p className="mt-4 text-neutral-600">Verifica que el enlace esté completo.</p></section><PieDePagina /></main>;
  }

  const alerta = entrada.anulada || entrada.usado;
  const estado = entrada.anulada ? "Entrada anulada" : "Entrada ya utilizada";
  const colorEstado = "bg-event-red text-white";
  const arteDataUrl = await generarEntradaArteDataUrl(entrada.id);

  return (
    <main className="event-shell grid place-items-center text-center">
      <section className="w-full max-w-md overflow-hidden bg-white shadow-brutal">
        <header className="bg-ink px-4 py-4 text-cream">
          <p className="text-[.65rem] font-black tracking-[0.16em] text-event-yellow uppercase">{evento.nombre}</p>
          <h1 className="mt-1 [overflow-wrap:anywhere] text-2xl font-black uppercase">{entrada.nombre_persona || "Entrada general"}</h1>
          <p className="mt-2 text-sm font-bold">
            {formatearFecha(evento.fecha)} · {formatearHora(evento.fecha)}
          </p>
          {evento.lugar && <p className="mt-0.5 text-xs text-cream/60">{evento.lugar}</p>}
        </header>
        <div className="border-t-2 border-dashed border-ink/20 p-3">
          <div className="w-full border-2 border-ink bg-white p-1.5">
            <Image src={arteDataUrl} alt={`Entrada de ${entrada.nombre_persona || "Entrada general"}`} width={621} height={1080} priority unoptimized className="h-auto w-full" />
          </div>
          {alerta && <p className={`mt-3 p-3 font-black uppercase ${colorEstado}`}>{estado}</p>}
          <p className="mt-3 text-xs text-neutral-500">Esta página es informativa. El personal de puerta validará el QR.</p>
        </div>
      </section>
      <PieDePagina />
    </main>
  );
}
