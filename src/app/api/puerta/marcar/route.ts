import { NextResponse } from "next/server";

import { obtenerSesionPuerta } from "@/lib/auth-puerta";
import { getDb } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const sesion = await obtenerSesionPuerta();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { token?: string; tokens?: string[] } | null;
  const recibidos = body?.tokens ?? (body?.token ? [body.token] : []);
  const tokens = [...new Set(recibidos)].filter((token) => UUID.test(token));
  if (tokens.length === 0 || tokens.length > 100 || tokens.length !== recibidos.length) return NextResponse.json({ error: "QR inválido." }, { status: 400 });
  const resultados = [];
  for (const token of tokens) {
    const { data, error } = await getDb().rpc("marcar_entrada", { p_id: token, p_usado_por: sesion.dispositivo });
    if (error) return NextResponse.json({ error: "No se pudo validar la entrada." }, { status: 500 });
    resultados.push({ token, ...(data?.[0] ?? { resultado: "no_existe" }) });
  }
  return NextResponse.json(tokens.length === 1 ? resultados[0] : { resultados });
}
