import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL || "NU STYL <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

async function send(to: string, subject: string, text: string, context: string) {
  if (!resend) return;
  try {
    // Resend wirft bei Fehlern nicht, sondern liefert { error } zurück.
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) console.error(`Resend-Fehler (${context}):`, error);
  } catch (err) {
    console.error(`Resend-Fehler (${context}):`, err);
  }
}

// Alle Sende-Funktionen sind No-Ops, solange RESEND_API_KEY nicht gesetzt
// ist -> Benachrichtigungen sind so "sauber abschaltbar" (einfach die
// Env-Variable weglassen).
export async function notifyAdmin(subject: string, text: string) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return;
  await send(to, subject, text, "Admin-Benachrichtigung");
}

// Jede Person bekommt ihre eigene Mail, damit Kunden-Adressen untereinander
// nicht sichtbar sind.
export async function notifyClients(emails: string[], subject: string, text: string) {
  if (emails.length === 0) return;
  await Promise.all(emails.map((to) => send(to, subject, text, "Kunden-Benachrichtigung")));
}

// E-Mail-Adressen aller eingeladenen Personen eines Kunden.
export async function clientPeopleEmails(clientId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: people } = await admin.from("profiles").select("id").eq("client_id", clientId);
  const emails = await Promise.all(
    (people ?? []).map(async (p) => (await admin.auth.admin.getUserById(p.id)).data.user?.email)
  );
  return emails.filter((e): e is string => !!e);
}

const postUrl = (postId: string) => `${process.env.NEXT_PUBLIC_SITE_URL}/beitraege/${postId}`;

// Kunde informieren: neue Beiträge stehen zur Freigabe bereit (eine Mail pro
// Person, auch wenn mehrere Beiträge auf einmal freigegeben werden).
export async function notifyClientNewPosts(
  clientId: string,
  posts: { id: string; title: string; approval_deadline: string | null }[]
) {
  const [first] = posts;
  if (!first) return;
  const lines = posts.map(
    (p) =>
      `• ${p.title}${p.approval_deadline ? ` (Freigabe bis ${formatDate(p.approval_deadline)})` : ""}\n  ${postUrl(p.id)}`
  );
  const subject =
    posts.length === 1 ? `Neu zur Freigabe: ${first.title}` :`${posts.length} neue Beiträge zur Freigabe`;
  const intro =
    posts.length === 1
      ? "im NU STYL Kundenportal steht ein neuer Beitrag für dich zur Freigabe bereit:"
      : "im NU STYL Kundenportal stehen neue Beiträge für dich zur Freigabe bereit:";
  await notifyClients(
    await clientPeopleEmails(clientId),
    subject,
    `Hallo,\n\n${intro}\n\n${lines.join("\n\n")}\n\nViele Grüße\nNU STYL`
  );
}

// Kunde informieren: NU STYL hat einen Kommentar geschrieben.
export async function notifyClientComment(
  clientId: string,
  post: { id: string; title: string },
  body: string
) {
  await notifyClients(
    await clientPeopleEmails(clientId),
    `Neue Nachricht von NU STYL: ${post.title}`,
    `Hallo,\n\nNU STYL hat zu "${post.title}" geschrieben:\n\n${body}\n\nAntworten kannst du direkt im Kundenportal:\n${postUrl(post.id)}\n\nViele Grüße\nNU STYL`
  );
}
