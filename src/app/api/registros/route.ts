import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { enviarAcuseCompra } from "@/lib/mail";

const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024;
const MAX_REGISTROS_POR_HORA = 5;
const MIME_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);

function error(message: string, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

class ErrorCompra extends Error {
  constructor(message: string, readonly status: number, readonly codigoOperacion?: string) {
    super(message);
  }
}

export async function POST(request: Request) {
  const db = getDb();
  const formData = await request.formData();
  const nombrePagador = String(formData.get("nombrePagador") ?? "").trim();
  const celular = String(formData.get("celular") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cantidadPersonas = Number(formData.get("cantidadPersonas"));
  const nombresRecibidos = formData.getAll("nombresPersonas").map((value) => String(value).trim());
  const archivos = formData
    .getAll("comprobantes")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const codigosOperacion = formData.getAll("codigosOperacion").map((value) => String(value).trim());
  const montosComprobantes = formData.getAll("montosComprobantes").map((value) => String(value).trim());

  if (
    !nombrePagador ||
    nombrePagador.length > 120 ||
    !celular ||
    celular.length > 30 ||
    email.length > 254 ||
    !/^\S+@\S+\.\S+$/.test(email)
  ) {
    return error("Completa nombre, celular y un correo válido.", 400);
  }

  if (!Number.isInteger(cantidadPersonas) || cantidadPersonas < 1 || cantidadPersonas > 20) {
    return error("La cantidad de entradas debe estar entre 1 y 20.", 400);
  }

  if (nombresRecibidos.length > cantidadPersonas || nombresRecibidos.some((nombre) => nombre.length > 120)) {
    return error("Revisa los nombres asignados a las entradas.", 400);
  }

  const nombresPersonas = Array.from(
    { length: cantidadPersonas },
    (_, index) => nombresRecibidos[index] || null,
  );

  if (archivos.length === 0) {
    return error("Adjunta al menos un comprobante de pago.", 400);
  }

  if (
    codigosOperacion.length !== archivos.length ||
    montosComprobantes.length !== archivos.length ||
    codigosOperacion.some((codigo) => !/^\d{8}$/.test(codigo)) ||
    montosComprobantes.some((monto) => !Number.isFinite(Number(monto)) || Number(monto) <= 0)
  ) {
    return error("Revisa los códigos y montos declarados de los comprobantes.", 400);
  }

  if (archivos.some((archivo) => archivo.size > MAX_ARCHIVO_BYTES || !MIME_PERMITIDOS.has(archivo.type))) {
    return error("Cada comprobante debe ser una imagen JPG, PNG o WebP de hasta 5 MB.", 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  const claveHash = hash(ip);
  const { data: permitido, error: rateLimitError } = await db.rpc("consumir_rate_limit", {
    p_alcance: "registro",
    p_clave_hash: claveHash,
    p_limite: MAX_REGISTROS_POR_HORA,
    p_ventana: "1 hour",
  });

  if (rateLimitError) {
    return error("No pudimos procesar tu solicitud. Inténtalo nuevamente.", 500);
  }

  if (!permitido) {
    return error("Alcanzaste el límite de intentos. Inténtalo nuevamente más tarde.", 429);
  }

  const [{ data: evento, error: eventoError }, { data: duplicados, error: duplicadosError }] = await Promise.all([
    db.from("evento").select("precio_unitario").limit(1).single(),
    db.from("comprobantes").select("codigo_operacion, registros!inner(status)").in("codigo_operacion", codigosOperacion).neq("registros.status", "rechazado"),
  ]);
  if (eventoError || !evento || duplicadosError) {
    return error("No pudimos procesar tu solicitud. Inténtalo nuevamente.", 500);
  }
  const totalEsperado = Math.round(Number(evento.precio_unitario) * cantidadPersonas * 100);
  const totalDeclarado = montosComprobantes.reduce((suma, monto) => suma + Math.round(Number(monto) * 100), 0);
  if (totalDeclarado !== totalEsperado) {
    return error("La suma de los pagos debe coincidir exactamente con el total de la compra.", 400);
  }
  const codigoDuplicado = duplicados?.[0]?.codigo_operacion;
  if (codigoDuplicado) {
    return error("El código de operación ya fue enviado.", 409, { codigoOperacion: codigoDuplicado });
  }

  const registroId = randomUUID();
  const rutasSubidas: string[] = [];

  try {
    for (const [index, archivo] of archivos.entries()) {
      const extension = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
      const path = `${registroId}/${index + 1}.${extension}`;
      const { error: storageError } = await db.storage
        .from("comprobantes")
        .upload(path, archivo, { contentType: archivo.type, upsert: false });

      if (storageError) {
        throw new Error("No pudimos subir uno de los comprobantes.");
      }

      rutasSubidas.push(path);
    }

    const { data, error: registroError } = await db.rpc("crear_registro", {
      p_id: registroId,
      p_nombre_pagador: nombrePagador,
      p_celular: celular,
      p_email: email,
      p_cantidad_personas: cantidadPersonas,
      p_nombres_personas: nombresPersonas,
      p_comprobantes: rutasSubidas.map((storage_path, index) => ({
        storage_path,
        codigo_operacion: codigosOperacion[index] || null,
        monto: montosComprobantes[index] ? Number(montosComprobantes[index]) : null,
      })),
    });

    if (registroError?.code === "23505" && registroError.message.includes("comprobantes_codigo_operacion_uniq")) {
      const codigo = registroError.details?.match(/\((\d{8})\)/)?.[1];
      throw new ErrorCompra("El código de operación ya fue enviado.", 409, codigo);
    }

    if (registroError || !data) {
      throw new Error(registroError?.message ?? "No pudimos registrar la compra.");
    }

    const correo = await enviarAcuseCompra(data);
    return NextResponse.json({ id: data, correo: { estado: correo.estado } }, { status: 201 });
  } catch (caught) {
    if (rutasSubidas.length > 0) {
      await db.storage.from("comprobantes").remove(rutasSubidas);
    }

    const message = caught instanceof Error ? caught.message : "No pudimos registrar la compra.";
    const status = caught instanceof ErrorCompra ? caught.status : message.includes("aforo") || message.includes("configurado") ? 409 : 500;
    return error(message, status, caught instanceof ErrorCompra && caught.codigoOperacion ? { codigoOperacion: caught.codigoOperacion } : undefined);
  }
}
