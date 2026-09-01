import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import type { EmailMessage, EmailSendingProvider } from "@/lib/email/types";

let transporter: Transporter | undefined;

function booleano(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} debe ser true o false.`);
}

function crearTransporter() {
  const host = process.env.SMTP_HOST?.trim() || (process.env.NODE_ENV === "production" ? "" : "127.0.0.1");
  const port = Number(process.env.SMTP_PORT || (process.env.NODE_ENV === "production" ? 465 : 55425));
  if (!host) throw new Error("Falta SMTP_HOST.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT no es válido.");
  const secure = booleano("SMTP_SECURE", port === 465);
  const esLoopback = host === "127.0.0.1" || host === "localhost" || host === "::1";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (process.env.NODE_ENV === "production" && (!user || !pass)) throw new Error("Faltan credenciales SMTP.");
  if (Boolean(user) !== Boolean(pass)) throw new Error("SMTP_USER y SMTP_PASS deben configurarse juntos.");
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: process.env.NODE_ENV === "production" && !secure && !esLoopback,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

export const nodemailerProvider: EmailSendingProvider = {
  name: "nodemailer",
  async send(message: EmailMessage) {
    transporter ??= crearTransporter();
    await transporter.sendMail({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments.map((item) => ({ filename: item.filename, content: item.content, cid: item.contentId, contentType: item.contentType, contentDisposition: "inline" })),
    });
  },
};
