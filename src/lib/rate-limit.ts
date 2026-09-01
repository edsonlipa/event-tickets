import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/lib/db";

export async function consumirRateLimit(alcance: "registro" | "reenviar" | "pin", clave: string, limite: number, ventana: string) {
  const claveHash = createHash("sha256").update(clave).digest("hex");
  const { data, error } = await getDb().rpc("consumir_rate_limit", {
    p_alcance: alcance,
    p_clave_hash: claveHash,
    p_limite: limite,
    p_ventana: ventana,
  });
  if (error) throw new Error("No se pudo comprobar el límite de solicitudes.");
  return Boolean(data);
}
