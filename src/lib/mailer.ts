/**
 * Penghantar e-mel ringkas tanpa dependensi tambahan.
 * - Jika RESEND_API_KEY ditetapkan: hantar melalui API HTTP Resend.
 * - Jika tidak: catat ke konsol (mod pembangunan) dan laporkan delivered=false.
 *   Jika MAIL_OUTBOX_FILE turut ditetapkan, setiap e-mel ditambah ke fail itu (satu JSON
 *   setiap baris) supaya ujian automatik boleh membaca kandungannya (cth. pautan tetapan semula).
 */
import { appendFileSync } from "fs";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailResult {
  delivered: boolean;
  provider: "RESEND" | "CONSOLE";
  id?: string;
  error?: string;
}

export function isMailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function getMailFrom(): string {
  return process.env.MAIL_FROM || "QueNombo <no-reply@quenombo.com>";
}

/** Tulis e-mel ke MAIL_OUTBOX_FILE (mod CONSOLE sahaja); kegagalan menulis tidak menghalang aliran. */
function appendToOutbox(message: MailMessage): void {
  const outbox = process.env.MAIL_OUTBOX_FILE;
  if (!outbox) return;
  try {
    appendFileSync(outbox, JSON.stringify({ ...message, sentAt: new Date().toISOString() }) + "\n");
  } catch (error) {
    console.error("[Mailer:CONSOLE] Gagal menulis MAIL_OUTBOX_FILE:", error);
  }
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[Mailer:CONSOLE] Kepada: ${message.to}\n  Subjek: ${message.subject}\n  ${message.text || message.html}`
    );
    appendToOutbox(message);
    return { delivered: false, provider: "CONSOLE" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getMailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      console.error("[Mailer:RESEND] Gagal:", res.status, data);
      return { delivered: false, provider: "RESEND", error: data.message || `HTTP ${res.status}` };
    }
    return { delivered: true, provider: "RESEND", id: data.id };
  } catch (error) {
    console.error("[Mailer:RESEND] Ralat rangkaian:", error);
    return { delivered: false, provider: "RESEND", error: (error as Error).message };
  }
}
