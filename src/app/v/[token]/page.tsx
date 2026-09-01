import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EntradaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const [{ data: entrada }, { data: evento }] = await Promise.all([
    db.from("entradas").select("id,nombre_persona,anulada,usado").eq("id", token).maybeSingle(),
    db.from("evento").select("nombre,fecha,lugar").maybeSingle(),
  ]);
  if (!entrada || !evento) return <main className="grid min-h-screen place-items-center p-6 text-center"><section><h1 className="text-3xl font-bold">Entrada no encontrada</h1><p className="mt-3 text-slate-600">Verifica que el enlace esté completo.</p></section></main>;
  const estado = entrada.anulada ? "Entrada anulada" : entrada.usado ? "Entrada ya utilizada" : "Entrada registrada";
  return <main className="grid min-h-screen place-items-center p-6 text-center"><section className="w-full max-w-md rounded-2xl border bg-white p-7 shadow-sm"><p className="text-sm font-semibold text-violet-700">{evento.nombre}</p><h1 className="mt-2 text-3xl font-bold">{entrada.nombre_persona || "Entrada general"}</h1>{evento.lugar && <p className="mt-2 text-slate-600">{evento.lugar}</p>}<p className="mt-5 rounded bg-slate-100 p-4 font-semibold">{estado}</p><p className="mt-4 text-sm text-slate-500">Esta página es informativa. El personal de puerta validará el QR.</p></section></main>;
}
