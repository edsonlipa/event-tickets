import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { enviarEntradas } from "@/lib/mail";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && UUID.test(id)))] : [];
  if (ids.length === 0 || ids.length > 12) return NextResponse.json({ error: "Selecciona entre 1 y 12 registros." }, { status: 400 });
  const { data, error } = await getDb().rpc("confirmar_registros", { p_ids: ids, p_admin_id: admin.id });
  if (error) return NextResponse.json({ error: "No se pudo confirmar el lote." }, { status: 500 });
  const correos = await Promise.all((data ?? []).map((id: string) => enviarEntradas(id)));
  return NextResponse.json({ confirmados: data?.length ?? 0, correos });
}
