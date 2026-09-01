import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const registroId = randomUUID();
const tokenConcurrente = randomUUID();
const tokenAnulado = randomUUID();
const tokenCola = randomUUID();
const comprador = `Guardia E2E ${randomUUID().slice(0, 6)}`;
const celular = "987654321";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase para E2E puerta.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function login(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-${randomUUID()}` });
  await page.goto("/puerta");
  await page.getByLabel("PIN").fill("123456");
  await page.getByRole("button", { name: "Entrar a puerta" }).click();
  await expect(page).toHaveURL(/\/puerta\/escaner$/);
  await expect(page.getByRole("heading", { name: "Escáner" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const client = db();
  const { error: registroError } = await client.from("registros").insert({ id: registroId, nombre_pagador: comprador, celular, email: `guardia-${registroId}@example.test`, cantidad_personas: 3, nombres_personas: ["Uno", "Dos", "Tres"], precio_unitario: 15, status: "pagado" });
  if (registroError) throw registroError;
  const { error: entradasError } = await client.from("entradas").insert([
    { id: tokenConcurrente, registro_id: registroId, nombre_persona: "Uno", anulada: false, usado: false },
    { id: tokenAnulado, registro_id: registroId, nombre_persona: "Dos", anulada: true, usado: false },
    { id: tokenCola, registro_id: registroId, nombre_persona: "Tres", anulada: false, usado: false },
  ]);
  if (entradasError) throw entradasError;
});

test.afterAll(async () => { await db().from("registros").delete().eq("id", registroId); });

test("protege APIs, bloquea fuerza bruta y no expone el PIN en la cookie", async ({ request }) => {
  expect((await request.get("/api/puerta/precarga")).status()).toBe(401);
  const ipBloqueada = `e2e-${randomUUID()}`;
  for (let index = 0; index < 5; index += 1) {
    const response = await request.post("/api/puerta/session", { headers: { "x-forwarded-for": ipBloqueada }, data: { pin: "000000" } });
    expect(response.status()).toBe(401);
  }
  const bloqueada = await request.post("/api/puerta/session", { headers: { "x-forwarded-for": ipBloqueada }, data: { pin: "123456" } });
  expect(bloqueada.status()).toBe(429);
  const correcta = await request.post("/api/puerta/session", { headers: { "x-forwarded-for": `e2e-${randomUUID()}` }, data: { pin: "123456" } });
  expect(correcta.status()).toBe(200);
  const cookie = correcta.headers()["set-cookie"];
  expect(cookie).toContain("HttpOnly");
  expect(cookie).not.toContain("123456");
});

test("dos validaciones simultáneas admiten una sola vez", async ({ page }) => {
  await login(page);
  const resultados = await page.evaluate(async (token) => {
    const responses = await Promise.all([
      fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }),
      fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }),
    ]);
    return Promise.all(responses.map(async (response) => (await response.json()).resultado));
  }, tokenConcurrente);
  expect(resultados.sort()).toEqual(["admitido", "ya_usado"]);
  const anulado = await page.evaluate(async (token) => (await (await fetch("/api/puerta/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })).json()).resultado, tokenAnulado);
  expect(anulado).toBe("anulada");
});

test("precarga y búsqueda minimizan PII", async ({ page }) => {
  await login(page);
  const precarga = await page.evaluate(async () => (await (await fetch("/api/puerta/precarga")).json()));
  expect(JSON.stringify(precarga)).not.toContain("@example.test");
  expect(JSON.stringify(precarga)).not.toContain(celular);
  const busqueda = await page.evaluate(async (q) => (await (await fetch(`/api/puerta/buscar?q=${encodeURIComponent(q)}`)).json()), comprador);
  const serializado = JSON.stringify(busqueda);
  expect(serializado).toContain(celular.slice(-3));
  expect(serializado).not.toContain(celular);
  expect(serializado).not.toContain("@example.test");
});

test("sincroniza la cola local y conserva el shell PWA sin red", async ({ page, context, request }) => {
  await login(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.evaluate((token) => localStorage.setItem("puerta:cola:v1", JSON.stringify([token])), tokenCola);
  await page.reload();
  await expect.poll(async () => (await db().from("entradas").select("usado").eq("id", tokenCola).single()).data?.usado).toBe(true);
  await expect.poll(async () => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  expect((await request.get("/manifest.json")).status()).toBe(200);
  expect((await request.get("/sw.js")).status()).toBe(200);
  await context.setOffline(true);
  expect(await page.evaluate(() => localStorage.getItem("puerta:precarga:v1"))).toContain(comprador);
  await page.getByPlaceholder("Nombre o celular").fill(comprador);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText(comprador, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Escáner" })).toBeVisible();
  await context.setOffline(false);
});
