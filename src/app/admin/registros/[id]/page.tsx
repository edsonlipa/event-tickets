/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";

import { AccionesRegistro } from "@/components/AccionesRegistro";
import { formatearFecha } from "@/lib/fecha";
import { obtenerRegistro } from "@/lib/admin-data";
import { getAdminUser } from "@/lib/auth-admin";

export const dynamic = "force-dynamic";

export default async function RegistroPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");
  const { id } = await params;
  const registro = await obtenerRegistro(id);
  if (!registro) notFound();
  const suma = registro.comprobantes.reduce((total, item) => total + (item.monto ?? 0), 0);
  const diferencia = suma - registro.monto_esperado;
  return <main className="mx-auto max-w-5xl px-5 py-8"><a href="/admin" className="text-sm font-semibold text-violet-700">← Volver</a><div className="mt-4 grid gap-8 lg:grid-cols-[1fr_320px]"><section><p className="text-sm font-semibold uppercase text-slate-500">{registro.status}</p><h1 className="text-3xl font-bold">{registro.nombre_pagador}</h1><dl className="mt-5 grid gap-3 rounded-xl bg-slate-100 p-5 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Celular</dt><dd>{registro.celular}</dd></div><div><dt className="text-sm text-slate-500">Email</dt><dd>{registro.email}</dd></div><div><dt className="text-sm text-slate-500">Entradas</dt><dd>{registro.cantidad_personas}</dd></div><div><dt className="text-sm text-slate-500">Creado</dt><dd>{formatearFecha(registro.created_at)}</dd></div><div><dt className="text-sm text-slate-500">Monto esperado</dt><dd className="font-bold">S/ {registro.monto_esperado.toFixed(2)}</dd></div><div><dt className="text-sm text-slate-500">Suma declarada</dt><dd className={`font-bold ${diferencia < 0 ? "text-red-700" : "text-emerald-700"}`}>S/ {suma.toFixed(2)} ({diferencia >= 0 ? "+" : ""}{diferencia.toFixed(2)})</dd></div></dl>{registro.motivo_rechazo && <p className="mt-4 rounded bg-red-50 p-4 text-red-800">Motivo: {registro.motivo_rechazo}</p>}<div className="mt-6 grid gap-4 sm:grid-cols-2">{registro.comprobantes.map((comprobante, index) => <figure key={comprobante.id} className="overflow-hidden rounded-xl border bg-white">{comprobante.signedUrl ? <img src={comprobante.signedUrl} alt={`Comprobante ${index + 1}`} className="max-h-[560px] w-full object-contain" /> : <div className="p-10 text-center">Sin imagen</div>}<figcaption className="p-3 text-sm">Operación: {comprobante.codigo_operacion ?? "sin código"} · Monto: {comprobante.monto === null ? "no declarado" : `S/ ${comprobante.monto.toFixed(2)}`}</figcaption></figure>)}</div></section><aside><AccionesRegistro id={registro.id} status={registro.status} emailError={registro.email_error} /></aside></div></main>;
}
