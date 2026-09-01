import "server-only";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
};

export type EmailMessage = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  attachments: EmailAttachment[];
};

export interface EmailSendingProvider {
  readonly name: "nodemailer" | "resend";
  send(message: EmailMessage): Promise<void>;
}
