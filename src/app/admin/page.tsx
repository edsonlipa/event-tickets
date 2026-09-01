import { redirect } from "next/navigation";

import { HojaComprobantes } from "@/components/HojaComprobantes";
import { LogoutAdmin } from "@/components/LogoutAdmin";
import { listarRegistros, obtenerContadores } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/auth-admin";

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

  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-6"><div className="mx-auto max-w-7xl"><header className="flex items-start justify-between gap-4 border-b-4 border-ink pb-5"><div><p className="event-kicker">Administración</p><h1 className="event-title mt-1">Registros de compra</h1></div><LogoutAdmin /></header><section className="mt-6 grid gap-3 sm:grid-cols-2"><div className="border-l-8 border-event-yellow bg-white p-4 shadow-[3px_3px_0_var(--ink)]"><span className="event-label">Aforo reservado/emitido</span><strong className="block text-2xl font-black">{contadores.ocupadas}{contadores.aforoMaximo === null ? " / sin límite" : ` / ${contadores.aforoMaximo}`}</strong></div><div className="border-l-8 border-event-red bg-white p-4 shadow-[3px_3px_0_var(--ink)]"><span className="event-label">Resultados</span><strong className="block text-2xl font-black">{lista.total}</strong></div></section><div className="mt-7 flex justify-end"><a href="/api/admin/export" className="event-button-outline">Exportar CSV</a></div><form className="mt-4 flex flex-wrap gap-3 bg-white p-4 shadow-[0_0_0_1px_rgba(28,28,28,.15)]"><input aria-label="Buscar registros" name="q" defaultValue={params.q} placeholder="Nombre, celular, email u operación" className="event-input min-w-72 flex-1" /><select aria-label="Estado" name="status" defaultValue={params.status ?? ""} className="border-2 border-ink bg-cream px-3 py-2 font-bold"><option value="">Todos</option><option value="pendiente">Pendientes</option><option value="pagado">Pagados</option><option value="rechazado">Rechazados</option></select><button className="event-button">Buscar</button></form><HojaComprobantes registros={registrosHoja} /><nav className="mt-8 flex items-center justify-center gap-3">{lista.pagina > 1 && <a className="event-button-outline" href={`?${new URLSearchParams([...queryBase, ["pagina", String(lista.pagina - 1)]]).toString()}`}>Anterior</a>}<span className="px-3 py-2 text-sm font-bold uppercase">Página {lista.pagina} de {lista.totalPaginas}</span>{lista.pagina < lista.totalPaginas && <a className="event-button-outline" href={`?${new URLSearchParams([...queryBase, ["pagina", String(lista.pagina + 1)]]).toString()}`}>Siguiente</a>}</nav></div></main>;
}
