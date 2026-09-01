import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { enviarEntradas } from "@/lib/mail";
import { consumirRateLimit } from "@/lib/rate-limit";

const MENSAJE = "Si existe una compra pagada con ese correo, te enviaremos las entradas.";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return NextResponse.json({ mensaje: MENSAJE });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  try {
    const [ipPermitida, emailPermitido] = await Promise.all([
      consumirRateLimit("reenviar", `ip:${ip}`, 5, "1 hour"),
      consumirRateLimit("reenviar", `email:${email}`, 3, "1 hour"),
    ]);
    if (!ipPermitida || !emailPermitido) return NextResponse.json({ mensaje: MENSAJE }, { status: 429 });
    const { data } = await getDb().from("registros").select("id").eq("email", email).eq("status", "pagado").limit(10);
    for (const registro of data ?? []) await enviarEntradas(registro.id, { forzar: true });
  } catch {
    // La respuesta pública nunca revela estado de cuenta ni fallos internos.
  }
  return NextResponse.json({ mensaje: MENSAJE });
}
