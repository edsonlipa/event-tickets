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
  return {
    nombrePagador: "Comprador concurrente",
    celular: "999999999",
    email: `${randomUUID()}@example.test`,
    cantidadPersonas: String(cantidadPersonas),
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
  await expect(page.getByRole("heading", { name: "OpenChampionship UNA" })).toBeVisible();
  await expect(page.getByText("QR pendiente. Usa el número de Yape mostrado.")).toBeVisible();
  await page.getByLabel("Nombre").fill("Comprador de prueba");
  await page.getByLabel("Celular").fill("999999999");
  await page.getByLabel("Correo").fill(`${randomUUID()}@example.test`);
  await page.getByLabel("Entradas").selectOption("3");
  await page.getByLabel("Nombre para entrada 1").fill("Ana");
  await page.getByLabel("Nombre para entrada 2").fill("Bruno");
  await page.getByLabel("Nombre para entrada 3").fill("Carla");

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
    page.getByRole("button", { name: /Registrar compra/ }).click(),
  ]);
  const body = (await response.json()) as { id: string };
  expect(response.status()).toBe(201);
  await expect(page.getByRole("heading", { name: "Gracias por tu compra" })).toBeVisible();

  const client = db();
  const { data: registro, error: registroError } = await client
    .from("registros")
    .select("status, cantidad_personas, nombres_personas")
    .eq("id", body.id)
    .single();
  expect(registroError).toBeNull();
  expect(registro).toMatchObject({
    status: "pendiente",
    cantidad_personas: 3,
    nombres_personas: ["Ana", "Bruno", "Carla"],
  });

  const { data: comprobante } = await client
    .from("comprobantes")
    .select("storage_path")
    .eq("registro_id", body.id)
    .single();
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
