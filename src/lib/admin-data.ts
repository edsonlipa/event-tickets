import "server-only";

import { getDb } from "@/lib/db";

export type ComprobanteAdmin = {
  id: string;
  storage_path: string;
  codigo_operacion: string | null;
  monto: number | null;
  signedUrl?: string;
};

export type RegistroAdmin = {
  id: string;
  nombre_pagador: string;
  celular: string;
  email: string;
  cantidad_personas: number;
  nombres_personas: Array<string | null>;
  precio_unitario: number;
  monto_esperado: number;
  status: "pendiente" | "pagado" | "rechazado";
  motivo_rechazo: string | null;
  email_enviado: boolean;
  email_error: string | null;
  created_at: string;
  comprobantes: ComprobanteAdmin[];
};

const CAMPOS = "id,nombre_pagador,celular,email,cantidad_personas,nombres_personas,precio_unitario,monto_esperado,status,motivo_rechazo,email_enviado,email_error,created_at,comprobantes(id,storage_path,codigo_operacion,monto)";

function normalizar(registro: Record<string, unknown>) {
  return {
    ...registro,
    precio_unitario: Number(registro.precio_unitario),
    monto_esperado: Number(registro.monto_esperado),
    comprobantes: ((registro.comprobantes ?? []) as Array<Record<string, unknown>>).map((comprobante) => ({
      ...comprobante,
      monto: comprobante.monto === null ? null : Number(comprobante.monto),
    })),
  } as RegistroAdmin;
}

async function firmarComprobantes(registros: RegistroAdmin[]) {
  const paths = registros.flatMap((registro) => registro.comprobantes.map((comprobante) => comprobante.storage_path));
  if (paths.length === 0) return registros;
  const { data, error } = await getDb().storage.from("comprobantes").createSignedUrls(paths, 300);
  if (error) throw new Error("No se pudieron firmar los comprobantes.");
  const urls = new Map(data.map((item) => [item.path, item.signedUrl]));
  return registros.map((registro) => ({
    ...registro,
    comprobantes: registro.comprobantes.map((comprobante) => ({
      ...comprobante,
      signedUrl: urls.get(comprobante.storage_path) ?? undefined,
    })),
  }));
}

export async function listarRegistros(params: { status?: string; q?: string; pagina: number }) {
  const db = getDb();
  let query = db.from("registros").select(CAMPOS).order("created_at", { ascending: false }).limit(1000);
  if (["pendiente", "pagado", "rechazado"].includes(params.status ?? "")) {
    query = query.eq("status", params.status!);
  }
  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar la bandeja.");
  const termino = params.q?.trim().toLocaleLowerCase("es") ?? "";
  const filtrados = (data ?? []).map((registro) => normalizar(registro as Record<string, unknown>)).filter((registro) => {
    if (!termino) return true;
    return [registro.nombre_pagador, registro.celular, registro.email, ...registro.comprobantes.map((item) => item.codigo_operacion ?? "")]
      .some((value) => value.toLocaleLowerCase("es").includes(termino));
  });
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 12));
  const pagina = Math.min(Math.max(1, params.pagina), totalPaginas);
  const visibles = filtrados.slice((pagina - 1) * 12, pagina * 12);
  return { registros: await firmarComprobantes(visibles), total: filtrados.length, pagina, totalPaginas };
}

export async function obtenerRegistro(id: string) {
  const { data, error } = await getDb().from("registros").select(CAMPOS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return (await firmarComprobantes([normalizar(data as Record<string, unknown>)]))[0];
}

export async function obtenerContadores() {
  const db = getDb();
  const [evento, entradas, pendientes] = await Promise.all([
    db.from("evento").select("aforo_maximo").maybeSingle(),
    db.from("entradas").select("id", { count: "exact", head: true }).eq("anulada", false),
    db.from("registros").select("cantidad_personas").eq("status", "pendiente"),
  ]);
  return {
    aforoMaximo: evento.data?.aforo_maximo ?? null,
    ocupadas: (entradas.count ?? 0) + (pendientes.data ?? []).reduce((total, item) => total + item.cantidad_personas, 0),
  };
}
