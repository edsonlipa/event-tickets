import { HojaComprobantes } from "@/components/HojaComprobantes";
import { LogoutAdmin } from "@/components/LogoutAdmin";
import { listarRegistros, obtenerContadores } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/auth-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; pagina?: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const params = await searchParams;
  const [lista, contadores] = await Promise.all([
    listarRegistros({ status: params.status, q: params.q, pagina: Number(params.pagina) || 1 }),
    obtenerContadores(),
  ]);
  const queryBase = new URLSearchParams();
  if (params.status) queryBase.set("status", params.status);
  if (params.q) queryBase.set("q", params.q);
  const registrosHoja = lista.registros.map((registro) => ({ id: registro.id, nombrePagador: registro.nombre_pagador, cantidadPersonas: registro.cantidad_personas, montoEsperado: registro.monto_esperado, status: registro.status, comprobanteUrl: registro.comprobantes[0]?.signedUrl }));
  return <main className="mx-auto max-w-7xl px-5 py-8"><header className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-violet-700">ADMINISTRACIÓN</p><h1 className="text-3xl font-bold">Registros de compra</h1></div><LogoutAdmin /></header><section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-100 p-4"><span className="text-sm text-slate-500">Aforo reservado/emitido</span><strong className="block text-2xl">{contadores.ocupadas}{contadores.aforoMaximo === null ? " / sin límite" : ` / ${contadores.aforoMaximo}`}</strong></div><div className="rounded-xl bg-slate-100 p-4"><span className="text-sm text-slate-500">Correos enviados hoy</span><strong className="block text-2xl">{contadores.correosHoy} / 100</strong></div><div className="rounded-xl bg-slate-100 p-4"><span className="text-sm text-slate-500">Resultados</span><strong className="block text-2xl">{lista.total}</strong></div></section><form className="mt-6 flex flex-wrap gap-3"><input name="q" defaultValue={params.q} placeholder="Nombre, celular, email u operación" className="min-w-72 flex-1 rounded border p-3" /><select name="status" defaultValue={params.status ?? ""} className="rounded border p-3"><option value="">Todos</option><option value="pendiente">Pendientes</option><option value="pagado">Pagados</option><option value="rechazado">Rechazados</option></select><button className="rounded bg-violet-700 px-5 py-3 font-semibold text-white">Buscar</button></form><HojaComprobantes registros={registrosHoja} /><nav className="mt-8 flex justify-center gap-3">{lista.pagina > 1 && <a className="rounded border px-4 py-2" href={`?${new URLSearchParams([...queryBase, ["pagina", String(lista.pagina - 1)]]).toString()}`}>Anterior</a>}<span className="px-3 py-2">Página {lista.pagina} de {lista.totalPaginas}</span>{lista.pagina < lista.totalPaginas && <a className="rounded border px-4 py-2" href={`?${new URLSearchParams([...queryBase, ["pagina", String(lista.pagina + 1)]]).toString()}`}>Siguiente</a>}</nav></main>;
}
