"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Berechtigung (Admin: alle, Kunde: nur eigene) prüft die Postgres-Funktion
// selbst — hier nur dünner Wrapper.
export async function editComment(postId: string, commentId: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("edit_comment", {
    p_comment_id: commentId,
    p_body: body,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/beitraege/${postId}`);
  revalidatePath(`/admin/beitraege/${postId}`);
}

export async function deleteComment(postId: string, commentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_comment", { p_comment_id: commentId });
  if (error) throw new Error(error.message);
  revalidatePath(`/beitraege/${postId}`);
  revalidatePath(`/admin/beitraege/${postId}`);
  revalidatePath("/admin");
}
