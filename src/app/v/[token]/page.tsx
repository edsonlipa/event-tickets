import Image from "next/image";

import { PieDePagina } from "@/components/PieDePagina";
import { getDb } from "@/lib/db";
import { formatearFecha, formatearHora } from "@/lib/fecha";
import { generarQrEntradaDataUrl } from "@/lib/qr";

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

  const estado = entrada.anulada ? "Entrada anulada" : entrada.usado ? "Entrada ya utilizada" : "Entrada registrada";
  const colorEstado = entrada.anulada || entrada.usado ? "bg-event-red text-white" : "bg-event-yellow text-ink";
  const qrDataUrl = await generarQrEntradaDataUrl(entrada.id);

  return (
    <main className="event-shell grid place-items-center text-center">
      <section className="w-full max-w-md overflow-hidden bg-white shadow-brutal">
        <header className="bg-ink p-6 text-cream">
          <p className="text-xs font-black tracking-[0.16em] text-event-yellow uppercase">{evento.nombre}</p>
          <h1 className="mt-3 [overflow-wrap:anywhere] text-3xl font-black uppercase">{entrada.nombre_persona || "Entrada general"}</h1>
          {evento.lugar && <p className="mt-2 text-sm text-cream/70">{evento.lugar}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-px bg-cream/20 text-left">
            <div className="bg-ink p-3">
              <dt className="text-[.65rem] font-black tracking-widest text-event-yellow uppercase">Fecha</dt>
              <dd className="mt-1 text-sm font-bold">{formatearFecha(evento.fecha)}</dd>
            </div>
            <div className="bg-ink p-3">
              <dt className="text-[.65rem] font-black tracking-widest text-event-yellow uppercase">Hora</dt>
              <dd className="mt-1 text-sm font-bold">{formatearHora(evento.fecha)}</dd>
            </div>
          </dl>
        </header>
        <div className="border-t-2 border-dashed border-ink/20 p-6">
          <div className="mx-auto mb-5 w-fit border-2 border-ink bg-white p-3">
            <Image src={qrDataUrl} alt={`QR de la entrada de ${entrada.nombre_persona || "Entrada general"}`} width={240} height={240} priority className="h-auto w-60" />
          </div>
          <p className={`p-4 font-black uppercase ${colorEstado}`}>{estado}</p>
          <p className="mt-5 text-sm text-neutral-500">Esta página es informativa. El personal de puerta validará el QR.</p>
        </div>
      </section>
      <PieDePagina />
    </main>
  );
}
