import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { enviarEntradas } from "@/lib/mail";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const { data, error } = await getDb().rpc("confirmar_registros", { p_ids: [id], p_admin_id: admin.id });
  if (error) return NextResponse.json({ error: "No se pudo confirmar el pago." }, { status: 500 });
  const confirmado = (data?.length ?? 0) === 1;
  const correo = confirmado ? await enviarEntradas(id) : { estado: "omitido" as const };
  return NextResponse.json({ confirmado, correo });
}
