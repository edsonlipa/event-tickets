import { FormularioCompra } from "@/components/FormularioCompra";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let evento: { nombre: string; precio_unitario: number; yape_numero: string; yape_titular: string; yape_qr_url: string | null } | null = null;

  try {
    const { data } = await getDb()
      .from("evento")
      .select("nombre, precio_unitario, yape_numero, yape_titular, yape_qr_url")
      .maybeSingle();
    evento = data;
  } catch {
    // La configuración local aún no existe.
  }

  if (evento) return <FormularioCompra evento={{ nombre: evento.nombre, precioUnitario: Number(evento.precio_unitario), yapeNumero: evento.yape_numero, yapeTitular: evento.yape_titular, yapeQrUrl: evento.yape_qr_url }} />;

  return <main className="grid min-h-screen place-items-center p-6 text-center"><section><h1 className="text-3xl font-bold">Venta aún no disponible</h1><p className="mt-3 text-slate-600">Estamos terminando la configuración del evento.</p></section></main>;
}
