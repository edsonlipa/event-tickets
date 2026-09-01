import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth-admin";
import { enviarEntradas } from "@/lib/mail";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const resultado = await enviarEntradas(id, { forzar: true });
  if (resultado.estado === "fallido") return NextResponse.json({ error: resultado.error }, { status: 502 });
  if (resultado.estado === "omitido") return NextResponse.json({ error: "El correo ya se está procesando o la compra no está pagada." }, { status: 409 });
  return NextResponse.json({ enviado: true });
}
