import { getAdminUser } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function celda(value: unknown) {
  let texto = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replaceAll('"', '""')}"`;
}

export async function GET() {
  if (!(await getAdminUser())) return Response.json({ error: "No autorizado." }, { status: 401 });
  const { data, error } = await getDb().from("registros").select("id,nombre_pagador,celular,email,cantidad_personas,precio_unitario,monto_esperado,status,email_enviado,created_at,entradas(usado,anulada)").order("created_at", { ascending: true });
  if (error) return Response.json({ error: "No se pudo generar la exportación." }, { status: 500 });
  const encabezado = ["id", "nombre_pagador", "celular", "email", "cantidad_personas", "precio_unitario", "monto_esperado", "status", "email_enviado", "entradas_activas", "entradas_usadas", "entradas_anuladas", "created_at"];
  const filas = (data ?? []).map((registro) => {
    const entradas = registro.entradas ?? [];
    return [registro.id, registro.nombre_pagador, registro.celular, registro.email, registro.cantidad_personas, registro.precio_unitario, registro.monto_esperado, registro.status, registro.email_enviado, entradas.filter((item) => !item.anulada).length, entradas.filter((item) => item.usado).length, entradas.filter((item) => item.anulada).length, registro.created_at];
  });
  const csv = `\uFEFF${[encabezado, ...filas].map((fila) => fila.map(celda).join(",")).join("\r\n")}\r\n`;
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=registros-evento.csv", "cache-control": "private, no-store" } });
}
