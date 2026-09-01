import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { inicioDiaLimaUtc } from "@/lib/fecha";
import { enviarEntradas } from "@/lib/mail";

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
  const { data, error } = await db.from("registros").select("id").eq("status", "pagado").eq("email_enviado", false).order("created_at").limit(disponibles);
  if (error) return NextResponse.json({ error: "No se pudo leer la cola." }, { status: 500 });
  const resultados = [];
  for (const registro of data ?? []) resultados.push(await enviarEntradas(registro.id));
  return NextResponse.json({ procesados: resultados.length, enviados: resultados.filter((item) => item.estado === "enviado").length, disponibles: Math.max(0, disponibles - resultados.length) });
}
