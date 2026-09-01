import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EntradaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [{ data: entrada }, { data: evento }] = await Promise.all([
    db.from("entradas").select("id,nombre_persona,anulada,usado").eq("id", token).maybeSingle(),
    db.from("evento").select("nombre,fecha,lugar").maybeSingle(),
  ]);
  if (!entrada || !evento) return <main className="event-shell grid place-items-center text-center"><section className="event-panel w-full max-w-md border-t-8 border-event-red"><p className="event-kicker">Código inválido</p><h1 className="event-title mt-2">Entrada no encontrada</h1><p className="mt-4 text-neutral-600">Verifica que el enlace esté completo.</p></section></main>;
  const estado = entrada.anulada ? "Entrada anulada" : entrada.usado ? "Entrada ya utilizada" : "Entrada registrada";
  const colorEstado = entrada.anulada || entrada.usado ? "bg-event-red text-white" : "bg-event-yellow text-ink";
  return <main className="event-shell grid place-items-center text-center"><section className="w-full max-w-md overflow-hidden bg-white shadow-brutal"><header className="bg-ink p-6 text-cream"><p className="text-xs font-black tracking-[0.16em] text-event-yellow uppercase">{evento.nombre}</p><h1 className="mt-3 [overflow-wrap:anywhere] text-3xl font-black uppercase">{entrada.nombre_persona || "Entrada general"}</h1>{evento.lugar && <p className="mt-2 text-sm text-cream/70">{evento.lugar}</p>}</header><div className="border-t-2 border-dashed border-ink/20 p-6"><p className={`p-4 font-black uppercase ${colorEstado}`}>{estado}</p><p className="mt-5 text-sm text-neutral-500">Esta página es informativa. El personal de puerta validará el QR.</p></div></section></main>;
}
