/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";

import { AccionesRegistro } from "@/components/AccionesRegistro";
import { obtenerRegistro } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/auth-admin";
import { formatearFecha } from "@/lib/fecha";

export const dynamic = "force-dynamic";

export default async function RegistroPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const { id } = await params;
  const registro = await obtenerRegistro(id);
  if (!registro) notFound();
  const suma = registro.comprobantes.reduce((total, item) => total + (item.monto ?? 0), 0);
  const diferencia = suma - registro.monto_esperado;

  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-6"><div className="mx-auto max-w-5xl"><a href="/admin" className="text-sm font-black text-event-blue underline decoration-2 underline-offset-4">← Volver al panel</a><div className="mt-5 grid gap-8 lg:grid-cols-[1fr_320px]"><section><div className="border-l-8 border-event-red bg-ink p-5 text-cream"><p className="text-xs font-black tracking-widest text-event-yellow uppercase">{registro.status}</p><h1 className="mt-1 [overflow-wrap:anywhere] text-3xl font-black uppercase">{registro.nombre_pagador}</h1></div><dl className="grid gap-px bg-ink sm:grid-cols-2">{[["Celular", registro.celular], ["Email", registro.email], ["Entradas", registro.cantidad_personas], ["Creado", formatearFecha(registro.created_at)]].map(([label, value]) => <div key={String(label)} className="bg-white p-4"><dt className="event-label">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}<div className="bg-event-yellow p-4"><dt className="event-label text-ink/60">Monto esperado</dt><dd className="text-xl font-black">S/ {registro.monto_esperado.toFixed(2)}</dd></div><div className="bg-white p-4"><dt className="event-label">Suma declarada</dt><dd className={`text-xl font-black ${diferencia < 0 ? "text-red-700" : "text-emerald-700"}`}>S/ {suma.toFixed(2)} ({diferencia >= 0 ? "+" : ""}{diferencia.toFixed(2)})</dd></div></dl>{registro.motivo_rechazo && <p className="mt-4 border-l-8 border-event-red bg-white p-4 text-red-800">Motivo: {registro.motivo_rechazo}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2">{registro.comprobantes.map((comprobante, index) => <figure key={comprobante.id} className="overflow-hidden bg-white shadow-[3px_3px_0_var(--ink)]">{comprobante.signedUrl ? <img src={comprobante.signedUrl} alt={`Comprobante ${index + 1}`} className="max-h-[560px] w-full object-contain" /> : <div className="p-10 text-center font-bold uppercase">Sin imagen</div>}<figcaption className="border-t-2 border-dashed border-ink/20 p-3 text-sm">Operación: {comprobante.codigo_operacion ?? "sin código"} · Monto: {comprobante.monto === null ? "no declarado" : `S/ ${comprobante.monto.toFixed(2)}`}</figcaption></figure>)}</div></section><aside><AccionesRegistro id={registro.id} status={registro.status} cantidadPersonas={registro.cantidad_personas} emailError={registro.email_error} /></aside></div></div></main>;
}
