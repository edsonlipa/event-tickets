import "server-only";

import { nodemailerProvider } from "@/lib/email/nodemailer-provider";
import { resendProvider } from "@/lib/email/resend-provider";
import type { EmailSendingProvider } from "@/lib/email/types";

export function getEmailSendingProvider(): EmailSendingProvider {
  const legacy = process.env.MAIL_TRANSPORT === "smtp" ? "nodemailer" : process.env.MAIL_TRANSPORT;
  const selected = process.env.EMAIL_SENDING_PROVIDER?.trim().toLowerCase() || legacy || "nodemailer";
  if (selected === "nodemailer") return nodemailerProvider;
  if (selected === "resend") return resendProvider;
  throw new Error("EMAIL_SENDING_PROVIDER debe ser nodemailer o resend.");
}
