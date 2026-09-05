/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";

import { AccionesRegistro } from "@/components/AccionesRegistro";
import { FallosCorreo } from "@/components/FallosCorreo";
import { sugerirCorreo } from "@/lib/dominio-correo";
import { obtenerRegistro } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/auth-admin";
import { formatearFechaHora } from "@/lib/fecha";

export const dynamic = "force-dynamic";

export default async function RegistroPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const { id } = await params;
  const registro = await obtenerRegistro(id);
  if (!registro) notFound();
  const suma = registro.comprobantes.reduce((total, item) => total + (item.monto ?? 0), 0);
  const diferencia = suma - registro.monto_esperado;

  // Un dominio mal tecleado no falla al enviar: conviene verlo justo al lado del
  // correo, que es lo que el operador lee antes de validar el pago.
  const correoSugerido = sugerirCorreo(registro.email);

  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-6"><div className="mx-auto max-w-5xl"><a href="/admin" className="text-sm font-black text-event-blue underline decoration-2 underline-offset-4">← Volver al panel</a><div className="mt-5 grid gap-8 lg:grid-cols-[1fr_320px]"><section><div className="border-l-8 border-event-red bg-ink p-5 text-cream"><p className="text-xs font-black tracking-widest text-event-yellow uppercase">{registro.status}</p><h1 className="mt-1 [overflow-wrap:anywhere] text-3xl font-black uppercase">{registro.nombre_pagador}</h1></div><dl className="grid gap-px bg-ink sm:grid-cols-2">{[["Celular", registro.celular], ["Email", registro.email], ["Entradas", registro.cantidad_personas], ["Creado", formatearFechaHora(registro.created_at)]].map(([label, value]) => <div key={String(label)} className="bg-white p-4"><dt className="event-label">{label}</dt><dd className="break-words font-semibold">{value}</dd>{label === "Email" && correoSugerido && <p role="alert" className="mt-2 bg-event-yellow px-3 py-2 text-center text-sm font-black text-ink uppercase">⚠ Posible correo mal escrito</p>}</div>)}<div className="bg-event-yellow p-4"><dt className="event-label text-ink/60">Monto esperado</dt><dd className="text-xl font-black">S/ {registro.monto_esperado.toFixed(2)}</dd></div><div className="bg-white p-4"><dt className="event-label">Suma declarada</dt><dd className={`text-xl font-black ${diferencia < 0 ? "text-red-700" : "text-emerald-700"}`}>S/ {suma.toFixed(2)} ({diferencia >= 0 ? "+" : ""}{diferencia.toFixed(2)})</dd></div></dl>{registro.motivo_rechazo && <p className="mt-4 border-l-8 border-event-red bg-white p-4 text-red-800">Motivo: {registro.motivo_rechazo}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2">{registro.comprobantes.map((comprobante, index) => <figure key={comprobante.id} className="overflow-hidden bg-white shadow-[3px_3px_0_var(--ink)]">{comprobante.signedUrl ? <a href={comprobante.signedUrl} target="_blank" rel="noopener noreferrer" title="Abrir la imagen en una pestaña nueva" className="group relative block cursor-zoom-in"><img src={comprobante.signedUrl} alt={`Comprobante ${index + 1}`} className="max-h-[560px] w-full object-contain" /><span className="absolute right-2 bottom-2 bg-ink/80 px-2 py-1 text-xs font-black text-cream uppercase group-hover:bg-ink">Ver en grande</span></a> : <div className="p-10 text-center font-bold uppercase">Sin imagen</div>}<figcaption className="border-t-2 border-dashed border-ink/20 p-3 text-sm">{comprobante.codigo_operacion && <>Operación: {comprobante.codigo_operacion} · </>}Monto: {comprobante.monto === null ? "no declarado" : `S/ ${comprobante.monto.toFixed(2)}`}</figcaption></figure>)}</div></section><aside><FallosCorreo fallos={registro.fallosCorreo} /><AccionesRegistro id={registro.id} status={registro.status} cantidadPersonas={registro.cantidad_personas} /></aside></div></div></main>;
}
