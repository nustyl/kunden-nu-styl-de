"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { notifyAdmin } from "@/lib/email/resend";

type Result = { error?: string };

function revalidatePost(postId: string) {
  revalidatePath(`/beitraege/${postId}`);
  revalidatePath(`/admin/beitraege/${postId}`);
}

// Kurze Info an NU STYL, wenn ein Kunde einen Punkt korrigiert oder entfernt.
async function notifyAdminOfClientChange(postId: string, text: string) {
  const session = await getCurrentProfile();
  if (!session || session.profile.role === "admin") return;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, clients ( name )")
    .eq("id", postId)
    .single<{ title: string; clients: { name: string } | null }>();
  await notifyAdmin(
    `Änderungswunsch angepasst: ${post?.title ?? ""}`,
    `${session.profile.full_name ?? post?.clients?.name ?? "Ein Kunde"} hat bei "${post?.title ?? postId}" ${text}\n\nDie Anzahl der genutzten Änderungsrunden bleibt unverändert.\n\n${process.env.NEXT_PUBLIC_SITE_URL}/admin/beitraege/${postId}`
  );
}

// Textkorrektur eines Punkts. Berechtigung prüft die Postgres-Funktion
// (Kunde: eigene Punkte der offenen Runde, Admin: alle). Die Anzahl der
// Änderungsschleifen bleibt dabei unverändert.
export async function editChangeRequest(postId: string, id: string, body: string): Promise<Result> {
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("change_requests")
    .select("section_key, section_label, category")
    .eq("id", id)
    .single();
  const { error } = await supabase.rpc("edit_change_request", { p_id: id, p_body: body });
  if (error) return { error: error.message };
  revalidatePost(postId);
  if (before) {
    const label =
      before.section_key === "single" ? before.category : `${before.section_label} · ${before.category}`;
    await notifyAdminOfClientChange(postId, `den Punkt "${label}" korrigiert:\n\n${body.trim()}`);
  }
  return {};
}

export async function deleteChangeRequest(postId: string, id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("change_requests")
    .select("section_key, section_label, category")
    .eq("id", id)
    .single();
  const { error } = await supabase.rpc("delete_change_request", { p_id: id });
  if (error) return { error: error.message };
  revalidatePost(postId);
  if (before) {
    const label =
      before.section_key === "single" ? before.category : `${before.section_label} · ${before.category}`;
    await notifyAdminOfClientChange(postId, `den Punkt "${label}" aus den Änderungswünschen entfernt.`);
  }
  return {};
}

// Nur NU STYL: Punkt als erledigt abhaken (bzw. wieder öffnen).
export async function setChangeRequestDone(
  postId: string,
  id: string,
  done: boolean
): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_requests")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePost(postId);
  return {};
}
