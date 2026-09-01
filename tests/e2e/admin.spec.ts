import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const emailAdmin = `admin-${randomUUID()}@example.test`;
const passwordAdmin = "Admin-E2E-2026!";
let adminId = "";
const ids: string[] = [];
const paths: string[] = [];
const casos = {
  loteA: { id: randomUUID(), nombre: `Lote A ${randomUUID().slice(0, 6)}`, cantidad: 2 },
  loteB: { id: randomUUID(), nombre: `Lote B ${randomUUID().slice(0, 6)}`, cantidad: 3 },
  concurrente: { id: randomUUID(), nombre: `Concurrente ${randomUUID().slice(0, 6)}`, cantidad: 3 },
  rechazo: { id: randomUUID(), nombre: `Rechazo ${randomUUID().slice(0, 6)}`, cantidad: 1 },
  ajuste: { id: randomUUID(), nombre: "=2+2", cantidad: 2 },
};
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9QAAAAABJRU5ErkJggg==", "base64");

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase para E2E admin.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(emailAdmin);
  await page.getByLabel("Contraseña").fill(passwordAdmin);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Registros de compra" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const client = db();
  const { data: usuario, error: usuarioError } = await client.auth.admin.createUser({
    email: emailAdmin,
    password: passwordAdmin,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (usuarioError || !usuario.user) throw usuarioError ?? new Error("No se creó el admin E2E.");
  adminId = usuario.user.id;

  const principales = Object.values(casos);
  const relleno = Array.from({ length: 9 }, (_, index) => ({
    id: randomUUID(), nombre: `Relleno ${index + 1} ${randomUUID().slice(0, 6)}`, cantidad: 1,
  }));
  const registros = [...principales, ...relleno];
  ids.push(...registros.map((registro) => registro.id));
  const ahora = Date.now();
  const { error: registrosError } = await client.from("registros").insert(registros.map((registro, index) => ({
    id: registro.id,
    nombre_pagador: registro.nombre,
    celular: `99999${String(index).padStart(4, "0")}`,
    email: `comprador-${registro.id}@example.test`,
    cantidad_personas: registro.cantidad,
    nombres_personas: Array.from({ length: registro.cantidad }, (_, posicion) => `${registro.nombre} ${posicion + 1}`),
    precio_unitario: 15,
    created_at: new Date(ahora + (registros.length - index) * 1000).toISOString(),
  })));
  if (registrosError) throw registrosError;

  for (const [index, registro] of registros.entries()) {
    const path = `e2e-admin/${registro.id}.png`;
    paths.push(path);
    const { error: uploadError } = await client.storage.from("comprobantes").upload(path, PNG, { contentType: "image/png" });
    if (uploadError) throw uploadError;
    const { error: comprobanteError } = await client.from("comprobantes").insert({
      registro_id: registro.id,
      storage_path: path,
      codigo_operacion: `OP-E2E-${index}-${registro.id.slice(0, 6)}`,
      monto: registro.cantidad * 15,
    });
    if (comprobanteError) throw comprobanteError;
  }
});

test.afterAll(async () => {
  const client = db();
  await client.from("registros").delete().in("id", ids);
  await client.storage.from("comprobantes").remove(paths);
  if (adminId) await client.auth.admin.deleteUser(adminId);
});

test("protege páginas y APIs sin una sesión admin", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const response = await request.post(`/api/admin/registros/${casos.loteA.id}/confirmar`);
  expect(response.status()).toBe(401);
  expect((await request.patch(`/api/admin/registros/${casos.ajuste.id}`, { data: { cantidadPersonas: 4 } })).status()).toBe(401);
  expect((await request.get("/api/admin/export")).status()).toBe(401);
});

test("muestra 12 comprobantes, busca por operación y confirma un lote", async ({ page }) => {
  await login(page);
  await expect(page.locator("article")).toHaveCount(12);

  const articuloA = page.locator("article").filter({ hasText: casos.loteA.nombre });
  const articuloB = page.locator("article").filter({ hasText: casos.loteB.nombre });
  await articuloA.getByRole("checkbox").check();
  await articuloB.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar lote (2)" }).click();
  await expect(page.getByText("2 pago(s) confirmado(s).")).toBeVisible();

  const client = db();
  const { data: pagados } = await client.from("registros").select("id,status").in("id", [casos.loteA.id, casos.loteB.id]);
  expect(pagados?.every((registro) => registro.status === "pagado")).toBe(true);
  const { count } = await client.from("entradas").select("id", { count: "exact", head: true }).in("registro_id", [casos.loteA.id, casos.loteB.id]);
  expect(count).toBe(5);

  await page.getByPlaceholder("Nombre, celular, email u operación").fill(`OP-E2E-0-${casos.loteA.id.slice(0, 6)}`);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByText(casos.loteA.nombre, { exact: true })).toBeVisible();
});

test("la confirmación concurrente es idempotente", async ({ page }) => {
  await login(page);
  const statuses = await page.evaluate(async (id) => {
    const respuestas = await Promise.all([
      fetch(`/api/admin/registros/${id}/confirmar`, { method: "POST" }),
      fetch(`/api/admin/registros/${id}/confirmar`, { method: "POST" }),
    ]);
    return respuestas.map((respuesta) => respuesta.status);
  }, casos.concurrente.id);
  expect(statuses).toEqual([200, 200]);
  const client = db();
  const { count } = await client.from("entradas").select("id", { count: "exact", head: true }).eq("registro_id", casos.concurrente.id);
  expect(count).toBe(3);
});

test("rechaza con motivo y conserva la auditoría", async ({ page }) => {
  await login(page);
  await page.goto(`/admin/registros/${casos.rechazo.id}`);
  await page.getByLabel("Motivo de rechazo").fill("El monto del comprobante no coincide");
  await page.getByRole("button", { name: "Rechazar" }).click();
  await expect(page.getByText("Este registro ya está rechazado.")).toBeVisible();
  const { data } = await db().from("registros").select("status,motivo_rechazo").eq("id", casos.rechazo.id).single();
  expect(data).toMatchObject({ status: "rechazado", motivo_rechazo: "El monto del comprobante no coincide" });
});

test("ajusta una compra pagada sin duplicar ni borrar entradas", async ({ page }) => {
  await login(page);
  await page.evaluate(async (id) => { await fetch(`/api/admin/registros/${id}/confirmar`, { method: "POST" }); }, casos.ajuste.id);
  const resultados = await page.evaluate(async (id) => Promise.all([
    fetch(`/api/admin/registros/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cantidadPersonas: 4 }) }),
    fetch(`/api/admin/registros/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ cantidadPersonas: 4 }) }),
  ]).then((responses) => responses.map((response) => response.status)), casos.ajuste.id);
  expect(resultados).toEqual([200, 200]);

  const client = db();
  const { data: entradas } = await client.from("entradas").select("id,nombre_persona,usado,anulada").eq("registro_id", casos.ajuste.id);
  expect(entradas).toHaveLength(4);
  const usada = entradas?.find((entrada) => entrada.nombre_persona)?.id;
  expect(usada).toBeTruthy();
  await client.from("entradas").update({ usado: true, usado_at: new Date().toISOString(), usado_por: "e2e" }).eq("id", usada!);

  await page.goto(`/admin/registros/${casos.ajuste.id}`);
  await page.getByLabel("Cantidad de entradas").fill("2");
  await page.getByRole("button", { name: "Guardar cantidad" }).click();
  await expect.poll(async () => (await client.from("registros").select("cantidad_personas").eq("id", casos.ajuste.id).single()).data?.cantidad_personas).toBe(2);
  const { data: entradasAjustadas } = await client.from("entradas").select("id,nombre_persona,usado,anulada,anulada_at,anulada_por").eq("registro_id", casos.ajuste.id);
  expect(entradasAjustadas).toHaveLength(4);
  expect(entradasAjustadas?.filter((entrada) => !entrada.anulada)).toHaveLength(2);
  expect(entradasAjustadas?.filter((entrada) => entrada.anulada)).toHaveLength(2);
  expect(entradasAjustadas?.find((entrada) => entrada.id === usada)).toMatchObject({ usado: true, anulada: false });
  expect(entradasAjustadas?.filter((entrada) => entrada.anulada).every((entrada) => entrada.nombre_persona === null && entrada.anulada_por === adminId && entrada.anulada_at)).toBe(true);
});

test("exporta CSV protegido y neutraliza fórmulas", async ({ page }) => {
  await login(page);
  const exportacion = await page.evaluate(async () => {
    const response = await fetch("/api/admin/export");
    return { status: response.status, type: response.headers.get("content-type"), disposition: response.headers.get("content-disposition"), body: await response.text() };
  });
  expect(exportacion.status).toBe(200);
  expect(exportacion.type).toContain("text/csv");
  expect(exportacion.disposition).toContain("registros-evento.csv");
  expect(exportacion.body).toContain("entradas_anuladas");
  expect(exportacion.body).toContain("\"'=2+2\"");
});
