import "server-only";

import { Resend } from "resend";

import type { EmailMessage, EmailSendingProvider } from "@/lib/email/types";

export const resendProvider: EmailSendingProvider = {
  name: "resend",
  async send(message: EmailMessage) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Falta RESEND_API_KEY.");
    const { error } = await new Resend(key).emails.send({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments.map((item) => ({ filename: item.filename, content: item.content, contentType: item.contentType, contentId: item.contentId })),
    });
    if (error) throw new Error(error.message);
  },
};
