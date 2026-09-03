import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const IMAGEN_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9QAAAAABJRU5ErkJggg==",
  "base64",
);

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase para las pruebas E2E.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function dimensionesJpeg(bytes: Uint8Array) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }
  throw new Error("El comprobante almacenado no contiene dimensiones JPEG.");
}

function compraMultipart(cantidadPersonas: number) {
  const monto = cantidadPersonas * 15;
  return {
    nombrePagador: "Comprador concurrente",
    celular: "999999999",
    email: `${randomUUID()}@example.test`,
    cantidadPersonas: String(cantidadPersonas),
    montosComprobantes: monto.toFixed(2),
    comprobantes: { name: "comprobante.png", mimeType: "image/png", buffer: IMAGEN_PNG },
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await db().from("evento").update({ aforo_maximo: null }).not("id", "is", null);
});

test("registra tres entradas, sus nombres y un comprobante comprimido", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-${randomUUID()}` });
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("II OPEN CHAMPIONSHIP");
  await page.getByLabel("Nombre del comprador").fill("Comprador de prueba");
  await page.getByLabel("Celular").fill("999999999");
  await page.getByLabel("Correo").fill(`${randomUUID()}@example.test`);
  await page.getByRole("button", { name: "Aumentar entradas" }).click();
  await page.getByRole("button", { name: "Aumentar entradas" }).click();
  await page.getByLabel("Nombre para entrada 1").fill("Ana");
  await page.getByLabel("Nombre para entrada 2").fill("Bruno");
  await page.getByLabel("Nombre para entrada 3").fill("Carla");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("Paso 2 de 2 — Pago")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR de Yape/i })).toBeVisible();
  await expect(page.getByLabel(/Código de operación/i)).toHaveCount(0);
  await expect(page.getByLabel("Monto pagado")).toHaveValue("45.00");
  await expect(page.getByRole("button", { name: "Registrar compra" })).toBeDisabled();

  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1200;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas no disponible");
    context.fillStyle = "#7c3aed";
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  });
  await page.getByLabel("Comprobante(s)").setInputFiles({
    name: "comprobante-grande.png",
    mimeType: "image/png",
    buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
  });

  const [response] = await Promise.all([
    page.waitForResponse("**/api/registros"),
    page.getByRole("button", { name: "Registrar compra" }).click(),
  ]);
  const body = (await response.json()) as { id: string };
  expect(response.status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Gracias por tu compra" })).toBeVisible();

  const client = db();
  const { data: registro, error: registroError } = await client
    .from("registros")
    .select("status, cantidad_personas, nombres_personas, email_registro_enviado, email_registro_error")
    .eq("id", body.id)
    .single();
  expect(registroError).toBeNull();
  expect(registro).toMatchObject({
    status: "pendiente",
    cantidad_personas: 3,
    nombres_personas: ["Ana", "Bruno", "Carla"],
    email_registro_enviado: true,
    email_registro_error: null,
  });

  const { data: envio } = await client
    .from("email_envios")
    .select("tipo,exito")
    .eq("registro_id", body.id)
    .eq("tipo", "registro_recibido")
    .single();
  expect(envio).toMatchObject({ tipo: "registro_recibido", exito: true });

  const { data: comprobante } = await client
    .from("comprobantes")
    .select("storage_path,codigo_operacion,monto")
    .eq("registro_id", body.id)
    .single();
  expect(comprobante).toMatchObject({ codigo_operacion: null, monto: 45 });
  const { data: archivo, error: descargaError } = await client.storage
    .from("comprobantes")
    .download(comprobante!.storage_path);
  expect(descargaError).toBeNull();
  expect(dimensionesJpeg(new Uint8Array(await archivo!.arrayBuffer()))).toEqual({ width: 1600, height: 800 });
});

test("rechaza archivos que no son imágenes antes de Storage", async ({ request }) => {
  const response = await request.post("/api/registros", {
    headers: { "x-forwarded-for": `e2e-${randomUUID()}` },
    multipart: {
      ...compraMultipart(1),
      comprobantes: { name: "no-es-imagen.txt", mimeType: "text/plain", buffer: Buffer.from("texto") },
    },
  });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("imagen") });
});

test("restaura el borrador sin conservar imágenes", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nombre del comprador").fill("Compra en borrador");
  await page.getByLabel("Celular").fill("999999999");
  await page.getByLabel("Correo").fill("borrador@example.test");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.reload();
  await expect(page.getByText("Paso 2 de 2 — Pago")).toBeVisible();
  await expect(page.getByText(/vuelve a seleccionar cada comprobante/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);
});

test("el monto es automático con un pago y editable al dividirlo", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nombre del comprador").fill("Compra dividida");
  await page.getByLabel("Celular").fill("999999999");
  await page.getByLabel("Correo").fill("dividida@example.test");
  await page.getByRole("button", { name: "Aumentar entradas" }).click();
  await expect(page.getByLabel("Nombre para entrada 1")).toHaveValue("Compra dividida");
  await page.getByRole("button", { name: "Reducir entradas" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByLabel("Monto pagado", { exact: true })).toHaveValue("15.00");
  await expect(page.getByLabel("Monto pagado", { exact: true })).toHaveAttribute("readonly", "");
  const dividir = page.getByRole("button", { name: "¿Necesitas dividir el pago?" });
  await expect(dividir).toHaveClass(/text-neutral-500/);
  await dividir.click();
  await expect(page.getByLabel("Monto pagado", { exact: true })).not.toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Monto pagado 2")).not.toHaveAttribute("readonly", "");
  await page.getByLabel("Monto pagado", { exact: true }).fill("10.00");
  await page.getByLabel("Monto pagado 2").fill("5.00");
  await page.getByLabel("Comprobante(s)").setInputFiles({
    name: "primer-pago.png",
    mimeType: "image/png",
    buffer: IMAGEN_PNG,
  });
  await expect(page.getByRole("button", { name: "Registrar compra" })).toBeDisabled();
});

test("rechaza en servidor una suma distinta al total", async ({ request }) => {
  const response = await request.post("/api/registros", {
    headers: { "x-forwarded-for": `e2e-${randomUUID()}` },
    multipart: { ...compraMultipart(1), montosComprobantes: "14.99" },
  });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("coincidir exactamente") });
});

test("acepta formularios antiguos pero ignora su código de operación", async ({ request }) => {
  const codigo = "87654321";
  const response = await request.post("/api/registros", {
    headers: { "x-forwarded-for": `e2e-${randomUUID()}` },
    multipart: { ...compraMultipart(1), codigosOperacion: codigo, montosComprobantes: "15" },
  });
  expect(response.status()).toBe(201);
  const body = await response.json() as { id: string };
  const { data } = await db().from("comprobantes").select("codigo_operacion").eq("registro_id", body.id).single();
  expect(data?.codigo_operacion).toBeNull();
});

test("serializa compras concurrentes para no superar el aforo", async ({ request }) => {
  const client = db();
  const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const [{ data: pendientes }, { data: entradas }] = await Promise.all([
    client.from("registros").select("cantidad_personas").eq("status", "pendiente").gte("created_at", desde),
    client.from("entradas").select("anulada"),
  ]);
  const reservadas =
    (pendientes ?? []).reduce((total, registro) => total + registro.cantidad_personas, 0) +
    (entradas ?? []).filter((entrada) => !entrada.anulada).length;
  await client.from("evento").update({ aforo_maximo: reservadas + 3 }).not("id", "is", null);

  try {
    const responses = await Promise.all([
      request.post("/api/registros", {
        headers: { "x-forwarded-for": `e2e-${randomUUID()}` },
        multipart: compraMultipart(3),
      }),
      request.post("/api/registros", {
        headers: { "x-forwarded-for": `e2e-${randomUUID()}` },
        multipart: compraMultipart(3),
      }),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
  } finally {
    await client.from("evento").update({ aforo_maximo: null }).not("id", "is", null);
  }
});

test("limita atómicamente el sexto registro de la misma IP", async ({ request }) => {
  const ip = `e2e-${randomUUID()}`;
  const statuses: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    const response = await request.post("/api/registros", {
      headers: { "x-forwarded-for": ip },
      multipart: compraMultipart(1),
    });
    statuses.push(response.status());
  }
  expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
});
