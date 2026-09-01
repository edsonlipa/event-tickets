import "server-only";

import nodemailer from "nodemailer";
import { Resend } from "resend";

import { getDb } from "@/lib/db";
import { formatearFecha } from "@/lib/fecha";
import { generarQrEntrada, urlEntrada } from "@/lib/qr";

type ResultadoEnvio = { estado: "enviado" | "fallido" | "omitido"; error?: string };

function escapar(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

function errorSeguro(error: unknown) {
  const message = error instanceof Error ? error.message : "Error desconocido del transporte";
  return message.replace(/re_[A-Za-z0-9_-]+/g, "[clave omitida]").slice(0, 500);
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
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || (process.env.NODE_ENV === "production" ? "" : "soporte@example.test");
  if (!replyTo) throw new Error("Falta RESEND_REPLY_TO.");
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
    from: process.env.RESEND_FROM || "Entradas <no-reply@illapasystems.com>",
    replyTo,
    subject: `Tus entradas para ${evento.nombre}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h1>¡Tu pago fue confirmado!</h1><p>Hola ${escapar(registro.nombre_pagador)}, estas son tus entradas para <strong>${escapar(evento.nombre)}</strong>.</p><p><strong>Fecha:</strong> ${escapar(formatearFecha(evento.fecha))}${evento.lugar ? `<br><strong>Lugar:</strong> ${escapar(evento.lugar)}` : ""}</p>${tarjetas}<p>¿Necesitas ayuda? Escríbenos a <a href="mailto:${escapar(replyTo)}">${escapar(replyTo)}</a>.</p></div>`,
    attachments: qrs,
  };
}

async function transportar(correo: Awaited<ReturnType<typeof armarCorreo>>) {
  if ((process.env.MAIL_TRANSPORT || "smtp") === "smtp") {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "127.0.0.1",
      port: Number(process.env.SMTP_PORT || 55425),
      secure: false,
    });
    await transport.sendMail({
      from: correo.from,
      to: correo.to,
      replyTo: correo.replyTo,
      subject: correo.subject,
      html: correo.html,
      attachments: correo.attachments.map((item) => ({ filename: item.filename, content: item.content, cid: item.cid, contentType: "image/png", contentDisposition: "inline" })),
    });
    return;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY.");
  const { error } = await new Resend(key).emails.send({
    from: correo.from,
    to: correo.to,
    replyTo: correo.replyTo,
    subject: correo.subject,
    html: correo.html,
    attachments: correo.attachments.map((item) => ({ filename: item.filename, content: item.content, contentType: "image/png", contentId: item.cid })),
  });
  if (error) throw new Error(error.message);
}

export async function enviarEntradas(registroId: string, options: { forzar?: boolean } = {}): Promise<ResultadoEnvio> {
  const db = getDb();
  const { data: reclamado, error: claimError } = await db.rpc("reclamar_correo", { p_id: registroId, p_forzar: options.forzar ?? false });
  if (claimError) return { estado: "fallido", error: errorSeguro(claimError) };
  if (!reclamado) return { estado: "omitido" };
  try {
    const correo = await armarCorreo(registroId);
    await transportar(correo);
    await db.from("registros").update({ email_enviado: true, email_enviado_at: new Date().toISOString(), email_error: null, email_intento_at: null }).eq("id", registroId);
    await db.from("email_envios").insert({ registro_id: registroId, exito: true });
    return { estado: "enviado" };
  } catch (error) {
    const message = errorSeguro(error);
    await db.from("registros").update({ email_enviado: false, email_error: message, email_intento_at: null }).eq("id", registroId);
    await db.from("email_envios").insert({ registro_id: registroId, exito: false, error: message });
    return { estado: "fallido", error: message };
  }
}
