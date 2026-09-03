import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { enviarRechazo } from "@/lib/mail";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { motivo?: string } | null;
  const motivo = body?.motivo?.trim() ?? "";
  if (motivo.length < 3 || motivo.length > 500) return NextResponse.json({ error: "El motivo debe tener entre 3 y 500 caracteres." }, { status: 400 });
  const { data, error } = await getDb().rpc("rechazar_registro", { p_id: id, p_motivo: motivo });
  if (error) return NextResponse.json({ error: "No se pudo rechazar el registro." }, { status: 500 });
  const rechazado = Boolean(data);
  // El rechazo ya está aplicado: un fallo de correo no lo revierte, queda
  // registrado en email_envios y el cron lo reintenta.
  const correo = rechazado ? await enviarRechazo(id) : { estado: "omitido" as const };
  return NextResponse.json({ rechazado, correo });
}
