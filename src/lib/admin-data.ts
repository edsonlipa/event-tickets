import "server-only";

import { getDb } from "@/lib/db";
import { interpretarFallo, type FalloCorreo } from "@/lib/fallo-correo";

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
  email_intento_at: string | null;
  email_registro_enviado: boolean;
  email_registro_error: string | null;
  email_registro_intento_at: string | null;
  created_at: string;
  comprobantes: ComprobanteAdmin[];
  /** Fallos de correo pendientes de resolver, de cualquiera de los tres tipos. */
  fallosCorreo: FalloCorreo[];
};

const CAMPOS = "id,nombre_pagador,celular,email,cantidad_personas,nombres_personas,precio_unitario,monto_esperado,status,motivo_rechazo,email_enviado,email_error,email_intento_at,email_registro_enviado,email_registro_error,email_registro_intento_at,created_at,comprobantes(id,storage_path,codigo_operacion,monto)";

function normalizar(registro: Record<string, unknown>) {
  return {
    ...registro,
    precio_unitario: Number(registro.precio_unitario),
    monto_esperado: Number(registro.monto_esperado),
    comprobantes: ((registro.comprobantes ?? []) as Array<Record<string, unknown>>).map((comprobante) => ({
      ...comprobante,
      monto: comprobante.monto === null ? null : Number(comprobante.monto),
    })),
    fallosCorreo: [] as FalloCorreo[],
  } as unknown as RegistroAdmin;
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

// Reúne los fallos de correo pendientes de los tres tipos. Acuse y entradas
// viven en columnas de `registros`; el rechazo, en el log `email_envios`, donde
// un fallo cuenta solo si no hubo un envío exitoso después.
async function adjuntarFallosCorreo(registros: RegistroAdmin[]) {
  if (registros.length === 0) return registros;
  const ids = registros.map((registro) => registro.id);
  const { data: envios } = await getDb()
    .from("email_envios")
    .select("registro_id,tipo,exito,error,created_at")
    .in("registro_id", ids)
    .eq("tipo", "rechazo")
    .order("created_at");

  const rechazo = new Map<string, { error: string; created_at: string } | null>();
  for (const envio of (envios ?? []) as Array<{ registro_id: string; exito: boolean; error: string | null; created_at: string }>) {
    // El último envío manda: un éxito posterior cancela el fallo anterior.
    rechazo.set(envio.registro_id, envio.exito ? null : { error: envio.error ?? "", created_at: envio.created_at });
  }

  return registros.map((registro) => {
    const fallos: FalloCorreo[] = [];
    if (registro.email_registro_error) {
      fallos.push({ tipo: "acuse", detalle: registro.email_registro_error, intentoAt: registro.email_registro_intento_at, ...interpretarFallo(registro.email_registro_error) });
    }
    if (registro.email_error) {
      fallos.push({ tipo: "entradas", detalle: registro.email_error, intentoAt: registro.email_intento_at, ...interpretarFallo(registro.email_error) });
    }
    const fallado = rechazo.get(registro.id);
    if (fallado) {
      fallos.push({ tipo: "rechazo", detalle: fallado.error, intentoAt: fallado.created_at, ...interpretarFallo(fallado.error) });
    }
    return { ...registro, fallosCorreo: fallos };
  });
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
  return { registros: await adjuntarFallosCorreo(await firmarComprobantes(visibles)), total: filtrados.length, pagina, totalPaginas };
}

export async function obtenerRegistro(id: string) {
  const { data, error } = await getDb().from("registros").select(CAMPOS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return (await adjuntarFallosCorreo(await firmarComprobantes([normalizar(data as Record<string, unknown>)])))[0];
}

export async function obtenerContadores() {
  const db = getDb();
  const [compras, entradas, validados, pendientes] = await Promise.all([
    db.from("registros").select("id", { count: "exact", head: true }),
    db.from("entradas").select("id", { count: "exact", head: true }).eq("anulada", false),
    db.from("registros").select("id", { count: "exact", head: true }).eq("status", "pagado"),
    db.from("registros").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
  ]);
  return {
    totalCompras: compras.count ?? 0,
    totalEntradas: entradas.count ?? 0,
    validados: validados.count ?? 0,
    pendientes: pendientes.count ?? 0,
  };
}
