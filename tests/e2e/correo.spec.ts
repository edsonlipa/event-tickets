import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const adminEmail = `correo-admin-${randomUUID()}@example.test`;
const adminPassword = "Correo-E2E-2026!";
const compraEmail = `entradas-${randomUUID()}@example.test`;
const reintentoEmail = `reintento-${randomUUID()}@example.test`;
const compraId = randomUUID();
const falloId = randomUUID();
let adminId = "";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase para E2E correo.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(adminEmail);
  await page.getByLabel("Contraseña").fill(adminPassword);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function buscarMensaje(request: APIRequestContext, destinatario: string) {
  await expect.poll(async () => {
    const response = await request.get("http://127.0.0.1:55424/api/v1/messages");
    const body = await response.json() as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
    return body.messages.find((message) => message.To.some((to) => to.Address === destinatario))?.ID ?? "";
  }).not.toBe("");
  const response = await request.get("http://127.0.0.1:55424/api/v1/messages");
  const body = await response.json() as { messages: Array<{ ID: string; To: Array<{ Address: string }> }> };
  return body.messages.find((message) => message.To.some((to) => to.Address === destinatario))!.ID;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const client = db();
  const { data, error } = await client.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true, app_metadata: { role: "admin" } });
  if (error || !data.user) throw error ?? new Error("No se creó el admin de correo.");
  adminId = data.user.id;
  const { error: insertError } = await client.from("registros").insert([
    { id: compraId, nombre_pagador: "Compra correo E2E", celular: "988888881", email: compraEmail, cantidad_personas: 2, nombres_personas: ["Ada", "Linus"], precio_unitario: 15 },
    { id: falloId, nombre_pagador: "Fallo correo E2E", celular: "988888882", email: "<>", cantidad_personas: 1, nombres_personas: ["Grace"], precio_unitario: 15 },
  ]);
  if (insertError) throw insertError;
});

test.afterAll(async () => {
  const client = db();
  await client.from("registros").delete().in("id", [compraId, falloId]);
  if (adminId) await client.auth.admin.deleteUser(adminId);
});

test("confirma, envía N QR por CID y la landing no consume la entrada", async ({ page, request }) => {
  await login(page);
  const response = await page.evaluate(async (id) => {
    const result = await fetch(`/api/admin/registros/${id}/confirmar`, { method: "POST" });
    return { status: result.status, body: await result.json() };
  }, compraId);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ confirmado: true, correo: { estado: "enviado" } });

  const client = db();
  const { data: registro } = await client.from("registros").select("status,email_enviado,email_error").eq("id", compraId).single();
  expect(registro).toMatchObject({ status: "pagado", email_enviado: true, email_error: null });
  const { data: entradas } = await client.from("entradas").select("id,nombre_persona,usado").eq("registro_id", compraId).order("created_at");
  expect(entradas).toHaveLength(2);

  const messageId = await buscarMensaje(request, compraEmail);
  const detail = await (await request.get(`http://127.0.0.1:55424/api/v1/message/${messageId}`)).json() as {
    HTML: string;
    ReplyTo: Array<{ Address: string }>;
    Inline: Array<{ PartID: string; ContentID: string; ContentType: string }>;
  };
  expect(detail.Inline).toHaveLength(2);
  expect(detail.ReplyTo[0].Address).toBe("soporte@example.test");
  expect(detail.Inline.every((item) => item.ContentType === "image/png" && detail.HTML.includes(`cid:${item.ContentID}`))).toBe(true);

  const qrResponse = await request.get(`http://127.0.0.1:55424/api/v1/message/${messageId}/part/${detail.Inline[0].PartID}`);
  const png = PNG.sync.read(Buffer.from(await qrResponse.body()));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe(`http://localhost:3000/v/${entradas![0].id}`);

  await page.goto(`/v/${entradas![0].id}`);
  await expect(page.getByRole("heading", { name: "Ada" })).toBeVisible();
  const { data: despues } = await client.from("entradas").select("usado,usado_at").eq("id", entradas![0].id).single();
  expect(despues).toMatchObject({ usado: false, usado_at: null });
});

test("un fallo conserva el pago y dos cron concurrentes reintentan sin duplicar", async ({ page, request }) => {
  await login(page);
  const confirmacion = await page.evaluate(async (id) => {
    const response = await fetch(`/api/admin/registros/${id}/confirmar`, { method: "POST" });
    return response.json();
  }, falloId);
  expect(confirmacion).toMatchObject({ confirmado: true, correo: { estado: "fallido" } });
  const client = db();
  const { data: fallido } = await client.from("registros").select("status,email_enviado,email_error").eq("id", falloId).single();
  expect(fallido?.status).toBe("pagado");
  expect(fallido?.email_enviado).toBe(false);
  expect(fallido?.email_error).toBeTruthy();
  await client.from("registros").update({ email: reintentoEmail }).eq("id", falloId);

  expect((await request.get("/api/cron/correos-pendientes")).status()).toBe(401);
  const hoy = new Date().toISOString();
  await client.from("email_envios").insert(Array.from({ length: 100 }, () => ({ registro_id: falloId, exito: true, error: "historial-e2e", created_at: hoy })));
  const respuestas = await Promise.all([
    request.get("/api/cron/correos-pendientes", { headers: { authorization: "Bearer cron-e2e" } }),
    request.get("/api/cron/correos-pendientes", { headers: { authorization: "Bearer cron-e2e" } }),
  ]);
  expect(respuestas.every((response) => response.status() === 200)).toBe(true);
  const resultadosCron = await Promise.all(respuestas.map((response) => response.json() as Promise<{ procesados: number; enviados: number; fallidos: number; pendientesRestantes: boolean }>));
  expect(resultadosCron.reduce((total, resultado) => total + resultado.enviados, 0)).toBeGreaterThanOrEqual(2);
  expect(resultadosCron.every((resultado) => typeof resultado.pendientesRestantes === "boolean")).toBe(true);
  await client.from("email_envios").delete().eq("error", "historial-e2e");

  const { data: enviado } = await client.from("registros").select("email_enviado,email_error").eq("id", falloId).single();
  expect(enviado).toMatchObject({ email_enviado: true, email_error: null });
  await buscarMensaje(request, reintentoEmail);
  const mensajes = await (await request.get("http://127.0.0.1:55424/api/v1/messages")).json() as { messages: Array<{ To: Array<{ Address: string }> }> };
  expect(mensajes.messages.filter((message) => message.To.some((to) => to.Address === reintentoEmail))).toHaveLength(2);
  const { data: auditoria } = await client.from("email_envios").select("tipo,exito").eq("registro_id", falloId).eq("exito", true);
  expect(auditoria?.filter((item) => item.tipo === "registro_recibido")).toHaveLength(1);
  expect(auditoria?.filter((item) => item.tipo === "entradas")).toHaveLength(1);
});

test("reenvío admin funciona y autoservicio no enumera compradores", async ({ page, request }) => {
  await login(page);
  const adminResponse = await page.evaluate(async (id) => (await fetch(`/api/admin/registros/${id}/reenviar`, { method: "POST" })).status, compraId);
  expect(adminResponse).toBe(200);
  const existente = await request.post("/api/reenviar", { headers: { "x-forwarded-for": `e2e-${randomUUID()}` }, data: { email: compraEmail } });
  const inexistente = await request.post("/api/reenviar", { headers: { "x-forwarded-for": `e2e-${randomUUID()}` }, data: { email: `nadie-${randomUUID()}@example.test` } });
  expect(existente.status()).toBe(200);
  expect(inexistente.status()).toBe(200);
  expect(await existente.json()).toEqual(await inexistente.json());
});
