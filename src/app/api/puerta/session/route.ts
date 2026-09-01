import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { crearSesionPuerta } from "@/lib/auth-puerta";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string } | null;
  const recibido = body?.pin ?? "";
  const esperado = process.env.GUARDIA_PIN ?? "";
  if (!/^\d{4,6}$/.test(esperado)) return NextResponse.json({ error: "El acceso de puerta no está configurado." }, { status: 503 });
  const coincide = recibido.length === esperado.length && timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const { data, error } = await getDb().rpc("registrar_intento_pin", { p_ip_hash: ipHash, p_exito: coincide });
  if (error) return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 500 });
  if (data === "bloqueado") return NextResponse.json({ error: "Demasiados intentos. Espera antes de volver a probar." }, { status: 429 });
  if (data !== "correcto") return NextResponse.json({ error: "PIN incorrecto." }, { status: 401 });
  await crearSesionPuerta();
  return NextResponse.json({ ok: true });
}
