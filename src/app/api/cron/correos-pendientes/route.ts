import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { inicioDiaLimaUtc } from "@/lib/fecha";
import { enviarAcuseCompra, enviarEntradas } from "@/lib/mail";

function autorizado(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== recibido.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(recibido));
}

export async function GET(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = getDb();
  const limiteConfigurado = Number(process.env.EMAIL_SEND_LIMIT || process.env.RESEND_LIMITE_DIARIO || 100);
  const limite = Number.isInteger(limiteConfigurado) && limiteConfigurado > 0 ? Math.min(limiteConfigurado, 1000) : 100;
  const { count } = await db.from("email_envios").select("id", { count: "exact", head: true }).eq("exito", true).gte("created_at", inicioDiaLimaUtc());
  const disponibles = Math.max(0, limite - (count ?? 0));
  if (disponibles === 0) return NextResponse.json({ procesados: 0, disponibles: 0 });
  const { data: acuses, error: acusesError } = await db.from("registros").select("id").eq("email_registro_enviado", false).order("created_at").limit(disponibles);
  if (acusesError) return NextResponse.json({ error: "No se pudo leer la cola de registros." }, { status: 500 });
  const resultados = [];
  for (const registro of acuses ?? []) resultados.push(await enviarAcuseCompra(registro.id));
  const restantes = Math.max(0, disponibles - resultados.length);
  if (restantes > 0) {
    const { data: entradas, error: entradasError } = await db.from("registros").select("id").eq("status", "pagado").eq("email_enviado", false).order("created_at").limit(restantes);
    if (entradasError) return NextResponse.json({ error: "No se pudo leer la cola de entradas." }, { status: 500 });
    for (const registro of entradas ?? []) resultados.push(await enviarEntradas(registro.id));
  }
  return NextResponse.json({ procesados: resultados.length, enviados: resultados.filter((item) => item.estado === "enviado").length, disponibles: Math.max(0, disponibles - resultados.length) });
}
