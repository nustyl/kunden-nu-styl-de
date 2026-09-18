import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL || "NU STYL <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

// Alle Sende-Funktionen sind No-Ops, solange RESEND_API_KEY nicht gesetzt
// ist -> Benachrichtigungen sind so "sauber abschaltbar" (einfach die
// Env-Variable weglassen).
export async function notifyAdmin(subject: string, text: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!resend || !to) return;
  try {
    await resend.emails.send({ from, to, subject, text });
  } catch (err) {
    console.error("Resend-Fehler (Admin-Benachrichtigung):", err);
  }
}

export async function notifyClients(emails: string[], subject: string, text: string) {
  if (!resend || emails.length === 0) return;
  try {
    await resend.emails.send({ from, to: emails, subject, text });
  } catch (err) {
    console.error("Resend-Fehler (Kunden-Benachrichtigung):", err);
  }
}
