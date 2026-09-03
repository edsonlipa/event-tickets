import "server-only";

import { getDb } from "@/lib/db";
import { getEmailSendingProvider } from "@/lib/email/provider";
import type { EmailMessage } from "@/lib/email/types";
import { formatearFechaHora } from "@/lib/fecha";
import { generarQrEntrada, urlEntrada } from "@/lib/qr";

type ResultadoEnvio = { estado: "enviado" | "fallido" | "omitido"; error?: string };

function escapar(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

function errorSeguro(error: unknown) {
  let message = error instanceof Error ? error.message : "Error desconocido del transporte";
  for (const secret of [process.env.RESEND_API_KEY, process.env.SMTP_PASS, process.env.SMTP_USER]) {
    if (secret) message = message.replaceAll(secret, "[secreto omitido]");
  }
  return message.replace(/re_[A-Za-z0-9_-]+/g, "[clave omitida]").slice(0, 500);
}

function configuracionRemitente() {
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || process.env.RESEND_REPLY_TO?.trim() || (process.env.NODE_ENV === "production" ? "" : "soporte@example.test");
  if (!replyTo) throw new Error("Falta EMAIL_REPLY_TO.");
  return {
    from: process.env.EMAIL_FROM || process.env.RESEND_FROM || "Entradas <no-reply@illapasystems.com>",
    replyTo,
  };
}

async function armarAcuseCompra(registroId: string) {
  const db = getDb();
  const [{ data: registro, error: registroError }, { data: evento, error: eventoError }] = await Promise.all([
    db.from("registros").select("id,nombre_pagador,email,cantidad_personas,precio_unitario,monto_esperado").eq("id", registroId).maybeSingle(),
    db.from("evento").select("nombre,fecha,lugar").maybeSingle(),
  ]);
  if (registroError || eventoError || !registro || !evento) throw new Error("No se encontró una compra válida para el acuse.");
  const remitente = configuracionRemitente();
  return {
    to: registro.email,
    ...remitente,
    subject: `Recibimos tu compra para ${evento.nombre}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#202020"><div style="background:#202020;color:#f3efe4;padding:28px"><p style="margin:0;color:#efc845;font-size:12px;font-weight:bold;letter-spacing:2px">COMPRA REGISTRADA</p><h1 style="margin:10px 0 0">Recibimos tu comprobante</h1></div><div style="padding:28px;border:1px solid #ddd"><p>Hola ${escapar(registro.nombre_pagador)}, registramos tu compra para <strong>${escapar(evento.nombre)}</strong>.</p><table style="width:100%;border-collapse:collapse;margin:24px 0"><tr><td style="padding:10px;background:#f3efe4">Entradas</td><td style="padding:10px;background:#f3efe4;text-align:right"><strong>${registro.cantidad_personas}</strong></td></tr><tr><td style="padding:10px">Precio unitario</td><td style="padding:10px;text-align:right"><strong>S/ ${Number(registro.precio_unitario).toFixed(2)}</strong></td></tr><tr><td style="padding:10px;background:#f3efe4">Total registrado</td><td style="padding:10px;background:#f3efe4;text-align:right"><strong>S/ ${Number(registro.monto_esperado).toFixed(2)}</strong></td></tr><tr><td style="padding:10px">Fecha y hora</td><td style="padding:10px;text-align:right"><strong>${escapar(formatearFechaHora(evento.fecha))}</strong></td></tr>${evento.lugar ? `<tr><td style="padding:10px;background:#f3efe4">Lugar</td><td style="padding:10px;background:#f3efe4;text-align:right"><strong>${escapar(evento.lugar)}</strong></td></tr>` : ""}</table><div style="border-left:6px solid #efc845;background:#202020;color:#f3efe4;padding:16px"><strong>Tu pago está pendiente de verificación.</strong><br>Cuando el administrador lo confirme, recibirás un segundo correo con tus entradas y códigos QR.</div><p style="margin-top:24px;font-size:12px;color:#666">Código de registro: ${escapar(registro.id)}</p><p>¿Necesitas ayuda? Escríbenos a <a href="mailto:${escapar(remitente.replyTo)}">${escapar(remitente.replyTo)}</a>.</p></div></div>`,
    attachments: [],
  } satisfies EmailMessage;
}

export async function enviarAcuseCompra(registroId: string): Promise<ResultadoEnvio> {
  const db = getDb();
  const { data: reclamado, error: claimError } = await db.rpc("reclamar_correo_registro", { p_id: registroId });
  if (claimError) return { estado: "fallido", error: errorSeguro(claimError) };
  if (!reclamado) return { estado: "omitido" };
  try {
    await getEmailSendingProvider().send(await armarAcuseCompra(registroId));
    await db.from("registros").update({ email_registro_enviado: true, email_registro_enviado_at: new Date().toISOString(), email_registro_error: null, email_registro_intento_at: null }).eq("id", registroId);
    await db.from("email_envios").insert({ registro_id: registroId, tipo: "registro_recibido", exito: true });
    return { estado: "enviado" };
  } catch (error) {
    const message = errorSeguro(error);
    await db.from("registros").update({ email_registro_enviado: false, email_registro_error: message, email_registro_intento_at: null }).eq("id", registroId);
    await db.from("email_envios").insert({ registro_id: registroId, tipo: "registro_recibido", exito: false, error: message });
    return { estado: "fallido", error: message };
  }
}

async function cargarCompra(registroId: string) {
  const db = getDb();
  const [{ data: registro, error: registroError }, { data: evento, error: eventoError }] = await Promise.all([
    db.from("registros").select("id,nombre_pagador,email,status").eq("id", registroId).maybeSingle(),
    db.from("evento").select("nombre,fecha,lugar").maybeSingle(),
  ]);
  if (registroError || eventoError || !registro || !evento || registro.status !== "pagado") {
    throw new Error("No se encontró una compra pagada válida para el correo.");
  }
  const { data: entradas, error: entradasError } = await db.from("entradas").select("id,nombre_persona,anulada").eq("registro_id", registroId).eq("anulada", false).order("created_at");
  if (entradasError || !entradas?.length) throw new Error("La compra no tiene entradas activas.");
  return { registro, evento, entradas };
}

async function armarCorreo(registroId: string) {
  const { registro, evento, entradas } = await cargarCompra(registroId);
  const { from, replyTo } = configuracionRemitente();
  const qrs = await Promise.all(entradas.map(async (entrada, index) => ({
    filename: `entrada-${index + 1}.png`,
    content: await generarQrEntrada(entrada.id),
    cid: `entrada-${entrada.id}@illapasystems.com`,
    nombre: entrada.nombre_persona || `Entrada ${index + 1}`,
    url: urlEntrada(entrada.id),
  })));
  const tarjetas = qrs.map((qr) => `<div style="margin:20px 0;padding:20px;border:1px solid #ddd;border-radius:12px;text-align:center"><h2>${escapar(qr.nombre)}</h2><img src="cid:${qr.cid}" width="240" height="240" alt="QR de ${escapar(qr.nombre)}"><p><a href="${escapar(qr.url)}">Abrir entrada</a></p></div>`).join("");
  return {
    to: registro.email,
    from,
    replyTo,
    subject: `Tus entradas para ${evento.nombre}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h1>¡Tu pago fue confirmado!</h1><p>Hola ${escapar(registro.nombre_pagador)}, estas son tus entradas para <strong>${escapar(evento.nombre)}</strong>.</p><p><strong>Fecha y hora:</strong> ${escapar(formatearFechaHora(evento.fecha))}${evento.lugar ? `<br><strong>Lugar:</strong> ${escapar(evento.lugar)}` : ""}</p>${tarjetas}<p>¿Necesitas ayuda? Escríbenos a <a href="mailto:${escapar(replyTo)}">${escapar(replyTo)}</a>.</p></div>`,
    attachments: qrs.map((item) => ({ filename: item.filename, content: item.content, contentType: "image/png", contentId: item.cid })),
  } satisfies EmailMessage;
}

export async function enviarEntradas(registroId: string, options: { forzar?: boolean } = {}): Promise<ResultadoEnvio> {
  const db = getDb();
  const { data: reclamado, error: claimError } = await db.rpc("reclamar_correo", { p_id: registroId, p_forzar: options.forzar ?? false });
  if (claimError) return { estado: "fallido", error: errorSeguro(claimError) };
  if (!reclamado) return { estado: "omitido" };
  try {
    const correo = await armarCorreo(registroId);
    await getEmailSendingProvider().send(correo);
    await db.from("registros").update({ email_enviado: true, email_enviado_at: new Date().toISOString(), email_error: null, email_intento_at: null }).eq("id", registroId);
    await db.from("email_envios").insert({ registro_id: registroId, tipo: "entradas", exito: true });
    return { estado: "enviado" };
  } catch (error) {
    const message = errorSeguro(error);
    await db.from("registros").update({ email_enviado: false, email_error: message, email_intento_at: null }).eq("id", registroId);
    await db.from("email_envios").insert({ registro_id: registroId, tipo: "entradas", exito: false, error: message });
    return { estado: "fallido", error: message };
  }
}
