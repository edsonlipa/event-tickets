import { NextResponse } from "next/server";

import { obtenerSesionPuerta } from "@/lib/auth-puerta";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  if (!(await obtenerSesionPuerta())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return NextResponse.json({ resultados: [] });
  const escaped = q.replace(/[%_,()]/g, "");
  const { data, error } = await getDb().from("registros").select("id,nombre_pagador,celular,cantidad_personas,status,entradas(usado,anulada)").or(`nombre_pagador.ilike.%${escaped}%,celular.ilike.%${escaped}%`).limit(20);
  if (error) return NextResponse.json({ error: "No se pudo buscar." }, { status: 500 });
  return NextResponse.json({ resultados: (data ?? []).map((registro) => ({ id: registro.id, nombreComprador: registro.nombre_pagador, celularUltimos3: registro.celular.slice(-3), cantidad: registro.cantidad_personas, estadoPago: registro.status, usadas: registro.entradas.filter((entrada) => entrada.usado).length, anuladas: registro.entradas.filter((entrada) => entrada.anulada).length })) });
}
