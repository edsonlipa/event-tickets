import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { enviarAcuseCompra, enviarEntradas, enviarRechazo } from "@/lib/mail";

const MAXIMO_TECNICO_POR_EJECUCION = 50;

function autorizado(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length !== recibido.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(recibido));
}

export async function GET(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = getDb();
  const { data: acuses, error: acusesError } = await db.from("registros").select("id").eq("email_registro_enviado", false).order("created_at").limit(MAXIMO_TECNICO_POR_EJECUCION);
  if (acusesError) return NextResponse.json({ error: "No se pudo leer la cola de registros." }, { status: 500 });
  const resultados = [];
  for (const registro of acuses ?? []) resultados.push(await enviarAcuseCompra(registro.id));
  const procesadosAcuse = resultados.filter((item) => item.estado !== "omitido").length;
  const restantes = Math.max(0, MAXIMO_TECNICO_POR_EJECUCION - procesadosAcuse);
  if (restantes > 0) {
    const { data: entradas, error: entradasError } = await db.from("registros").select("id").eq("status", "pagado").eq("email_enviado", false).order("created_at").limit(restantes);
    if (entradasError) return NextResponse.json({ error: "No se pudo leer la cola de entradas." }, { status: 500 });
    for (const registro of entradas ?? []) resultados.push(await enviarEntradas(registro.id));
  }
  const restantesRechazo = Math.max(0, MAXIMO_TECNICO_POR_EJECUCION - resultados.filter((item) => item.estado !== "omitido").length);
  if (restantesRechazo > 0) {
    const { data: rechazos, error: rechazosError } = await db.rpc("rechazos_con_correo_pendiente", { p_limite: restantesRechazo });
    if (rechazosError) return NextResponse.json({ error: "No se pudo leer la cola de rechazos." }, { status: 500 });
    for (const registro of rechazos ?? []) resultados.push(await enviarRechazo(registro.id));
  }
  const procesados = resultados.filter((item) => item.estado !== "omitido");
  const [{ data: acusesPendientes, error: acusesPendientesError }, { data: entradasPendientes, error: entradasPendientesError }] = await Promise.all([
    db.from("registros").select("id").eq("email_registro_enviado", false).limit(1),
    db.from("registros").select("id").eq("status", "pagado").eq("email_enviado", false).limit(1),
  ]);
  const { data: rechazosPendientes, error: rechazosPendientesError } = await db.rpc("rechazos_con_correo_pendiente", { p_limite: 1 });
  if (acusesPendientesError || entradasPendientesError || rechazosPendientesError) {
    return NextResponse.json({ error: "No se pudo comprobar la cola restante." }, { status: 500 });
  }
  return NextResponse.json({
    procesados: procesados.length,
    enviados: procesados.filter((item) => item.estado === "enviado").length,
    fallidos: procesados.filter((item) => item.estado === "fallido").length,
    pendientesRestantes: Boolean(acusesPendientes?.length || entradasPendientes?.length || rechazosPendientes?.length),
  });
}
