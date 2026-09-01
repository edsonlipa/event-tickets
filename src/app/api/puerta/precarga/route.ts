import { NextResponse } from "next/server";

import { obtenerSesionPuerta } from "@/lib/auth-puerta";
import { getDb } from "@/lib/db";

export async function GET() {
  if (!(await obtenerSesionPuerta())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await getDb().from("entradas").select("id,nombre_persona,usado,registros(nombre_pagador)").eq("anulada", false);
  if (error) return NextResponse.json({ error: "No se pudo preparar la lista." }, { status: 500 });
  return NextResponse.json({ entradas: (data ?? []).map((entrada) => {
    const relacion = entrada.registros as unknown as { nombre_pagador: string } | Array<{ nombre_pagador: string }> | null;
    return { token: entrada.id, nombrePersona: entrada.nombre_persona, nombreComprador: Array.isArray(relacion) ? relacion[0]?.nombre_pagador : relacion?.nombre_pagador, usado: entrada.usado };
  }) });
}
