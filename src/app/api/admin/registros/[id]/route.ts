import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { cantidadPersonas?: unknown } | null;
  const cantidad = Number(body?.cantidadPersonas);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
    return NextResponse.json({ error: "La cantidad debe estar entre 1 y 20." }, { status: 400 });
  }
  const { id } = await params;
  const { data, error } = await getDb().rpc("ajustar_cantidad_pagada", { p_id: id, p_cantidad: cantidad, p_admin_id: admin.id });
  if (error) {
    const esperado = error.code === "22023" || error.code === "P0001";
    return NextResponse.json({ error: esperado ? error.message : "No se pudo ajustar la cantidad." }, { status: esperado ? 409 : 500 });
  }
  return NextResponse.json({ ajuste: data?.[0] ?? null });
}
