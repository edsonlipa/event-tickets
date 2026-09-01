import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

const COOKIE = "puerta_session";
const EXPIRACION_PROVISIONAL = new Date("2026-09-07T04:59:59.000Z");

type SesionPuerta = { exp: number; dispositivo: string };

function secret() {
  const value = process.env.SESSION_SECRET ?? "";
  if (value.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
  return value;
}

function firma(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function crearSesionPuerta() {
  const payload: SesionPuerta = { exp: EXPIRACION_PROVISIONAL.getTime(), dispositivo: randomUUID() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  (await cookies()).set(COOKIE, `${encoded}.${firma(encoded)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: EXPIRACION_PROVISIONAL,
  });
}

export async function obtenerSesionPuerta() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = firma(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as SesionPuerta;
    if (!parsed.dispositivo || parsed.exp <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
