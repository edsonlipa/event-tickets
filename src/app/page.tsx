import { FormularioCompra } from "@/components/FormularioCompra";
import { getDb } from "@/lib/db";
import { formatearFecha } from "@/lib/fecha";

export const dynamic = "force-dynamic";

export default async function Home() {
  let evento: { nombre: string; fecha: string; lugar: string | null; precio_unitario: number; yape_numero: string; yape_titular: string; yape_qr_url: string | null } | null = null;

  try {
    const { data } = await getDb()
      .from("evento")
      .select("nombre, fecha, lugar, precio_unitario, yape_numero, yape_titular, yape_qr_url")
      .maybeSingle();
    evento = data;
  } catch {
    // La configuración local aún no existe.
  }

  if (evento) return <FormularioCompra evento={{ nombre: evento.nombre, fecha: formatearFecha(evento.fecha), lugar: evento.lugar, precioUnitario: Number(evento.precio_unitario), yapeNumero: evento.yape_numero, yapeTitular: evento.yape_titular, yapeQrUrl: evento.yape_qr_url }} />;

  return <main className="event-shell grid place-items-center text-center"><section className="event-panel w-full max-w-md border-t-8 border-event-yellow"><p className="event-kicker">Entradas</p><h1 className="event-title mt-2">Venta aún no disponible</h1><p className="mt-4 text-neutral-600">Estamos terminando la configuración del evento.</p></section></main>;
}
