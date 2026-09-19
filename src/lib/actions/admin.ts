"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { berlinLocalToISO } from "@/lib/format";
import type { PostFormat, PostStatus } from "@/types/database";

// -------------------------------------------------------------------
// Kunden
// -------------------------------------------------------------------
export async function createClientCompany(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name ist erforderlich");

  const supabase = await createClient();

  // Doppelklick / erneutes Absenden: bestehenden Kunden gleichen Namens wiederverwenden.
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (existing) {
    redirect(`/admin/kunden/${existing.id}`);
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/kunden");
  redirect(`/admin/kunden/${data.id}`);
}

const REVISION_ROUNDS_FORMAT_KEYS = ["reel", "beitrag", "story"] as const;

export async function updateClientCompany(clientId: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name ist erforderlich");
  const roundsRaw = String(formData.get("max_revision_rounds") ?? "").trim();
  const max_revision_rounds = roundsRaw === "" ? null : Number(roundsRaw);

  const max_revision_rounds_by_format: Record<string, number | null> = {};
  for (const key of REVISION_ROUNDS_FORMAT_KEYS) {
    if (formData.get(`rounds_${key}_unlimited`)) {
      max_revision_rounds_by_format[key] = null;
      continue;
    }
    const raw = String(formData.get(`rounds_${key}`) ?? "").trim();
    if (raw !== "") max_revision_rounds_by_format[key] = Number(raw);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ name, max_revision_rounds, max_revision_rounds_by_format })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/kunden/${clientId}`);
  revalidatePath("/admin/kunden");
}

export async function inviteClientUser(clientId: string, formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!email) throw new Error("E-Mail ist erforderlich");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    data: { client_id: clientId, full_name: fullName || null, role: "client" },
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/kunden/${clientId}`);
}

// Einzelne Person wieder entfernen (Zugang + Profil, Beiträge/Kommentare
// des Kunden bleiben unberührt).
export async function revokeClientUser(clientId: string, personId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(personId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/kunden/${clientId}`);
}

// Zugang sperren, alle Daten (Beiträge, Medien, Verlauf) bleiben erhalten.
export async function archiveClient(clientId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: people } = await supabase
    .from("profiles")
    .select("id")
    .eq("client_id", clientId);

  for (const person of people ?? []) {
    await admin.auth.admin.updateUserById(person.id, {
      ban_duration: "876000h", // ~100 Jahre, praktisch dauerhaft
    });
  }

  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/kunden/${clientId}`);
  revalidatePath("/admin/kunden");
}

export async function unarchiveClient(clientId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: people } = await supabase
    .from("profiles")
    .select("id")
    .eq("client_id", clientId);

  for (const person of people ?? []) {
    await admin.auth.admin.updateUserById(person.id, { ban_duration: "none" });
  }

  const { error } = await supabase
    .from("clients")
    .update({ archived_at: null })
    .eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/kunden/${clientId}`);
  revalidatePath("/admin/kunden");
}

// Unwiderruflich: Zugänge, Beiträge, Kommentare und R2-Dateien werden
// komplett gelöscht. Nur für Testläufe / echte Löschwünsche.
export async function deleteClientHard(clientId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: posts } = await admin.from("posts").select("id").eq("client_id", clientId);
  const postIds = (posts ?? []).map((p) => p.id);

  if (postIds.length > 0) {
    const { data: media } = await admin
      .from("post_media")
      .select("r2_key")
      .in("post_id", postIds);

    const keys = (media ?? [])
      .map((m) => m.r2_key)
      .filter((k) => k && !k.startsWith("deleted/"));

    if (keys.length > 0) {
      // R2/S3 erlaubt max. 1000 Objekte pro Löschanfrage
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: { Objects: batch.map((Key) => ({ Key })) },
          })
        );
      }
    }
  }

  const { data: people } = await admin.from("profiles").select("id").eq("client_id", clientId);
  for (const person of people ?? []) {
    await admin.auth.admin.deleteUser(person.id);
  }

  const { error } = await admin.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/kunden");
  redirect("/admin/kunden");
}

// Speicher sparen: löscht die Dateien aller VERÖFFENTLICHTEN Beiträge eines
// Kunden aus R2. Beiträge, Kommentare und Verlauf bleiben erhalten.
export async function deletePublishedMedia(clientId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from("posts")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "veroeffentlicht");
  const postIds = (posts ?? []).map((p) => p.id);
  if (postIds.length === 0) return;

  const { data: media } = await admin
    .from("post_media")
    .select("id, r2_key")
    .in("post_id", postIds);

  const live = (media ?? []).filter((m) => m.r2_key && !m.r2_key.startsWith("deleted/"));

  for (let i = 0; i < live.length; i += 1000) {
    const batch = live.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: batch.map((m) => ({ Key: m.r2_key })) },
      })
    );
  }

  await Promise.all(
    live.map((m) =>
      admin.from("post_media").update({ r2_key: `deleted/${m.id}` }).eq("id", m.id)
    )
  );

  revalidatePath(`/admin/kunden/${clientId}`);
  revalidatePath("/admin");
}

// -------------------------------------------------------------------
// Beiträge
// -------------------------------------------------------------------
function parsePlatforms(formData: FormData): string[] {
  return formData.getAll("platforms").map(String);
}

export async function createPost(formData: FormData): Promise<{ id: string; clientId: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    client_id: String(formData.get("client_id")),
    title: String(formData.get("title") ?? "").trim(),
    format: String(formData.get("format")) as PostFormat,
    platforms: parsePlatforms(formData),
    caption: String(formData.get("caption") ?? ""),
    hashtags: String(formData.get("hashtags") ?? ""),
    publish_date: berlinLocalToISO(formData.get("publish_date") as string),
    approval_deadline: (formData.get("approval_deadline") as string) || null,
  };

  if (!payload.client_id || !payload.title) {
    throw new Error("Kunde und Titel sind erforderlich");
  }

  const { data, error } = await supabase.from("posts").insert(payload).select().single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/beitraege");
  return { id: data.id, clientId: data.client_id };
}

export async function updatePost(postId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    format: String(formData.get("format")) as PostFormat,
    platforms: parsePlatforms(formData),
    caption: String(formData.get("caption") ?? ""),
    hashtags: String(formData.get("hashtags") ?? ""),
    publish_date: berlinLocalToISO(formData.get("publish_date") as string),
    approval_deadline: (formData.get("approval_deadline") as string) || null,
    status: String(formData.get("status")) as PostStatus,
  };

  const { data: updated, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .select("client_id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/beitraege/${postId}`);
  revalidatePath(`/admin/kunden/${updated.client_id}`);
  revalidatePath("/admin/beitraege");
  revalidatePath("/admin");
  redirect(`/admin/kunden/${updated.client_id}`);
}

export async function deleteComment(postId: string, commentId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("post_id", postId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/beitraege/${postId}`);
  revalidatePath(`/beitraege/${postId}`);
  revalidatePath("/admin");
}

export async function reuploadNewVersion(postId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("version")
    .eq("id", postId)
    .single();

  const { error } = await supabase
    .from("posts")
    .update({ version: (post?.version ?? 1) + 1, status: "zur_freigabe" })
    .eq("id", postId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/beitraege/${postId}`);
}

export async function batchSetStatus(postIds: string[], status: PostStatus) {
  await requireAdmin();
  if (postIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status }).in("id", postIds);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/beitraege");
  revalidatePath("/admin");
}

export async function deletePost(postId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: media } = await supabase
    .from("post_media")
    .select("r2_key")
    .eq("post_id", postId);

  const keys = (media ?? [])
    .map((m) => m.r2_key)
    .filter((k) => k && !k.startsWith("deleted/"));

  if (keys.length > 0) {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      })
    );
  }

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/beitraege");
  redirect("/admin/beitraege");
}

// Admin gewährt eine zusätzliche Änderungsschleife über das Kunden-Limit hinaus.
export async function grantRevisionException(postId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("revision_rounds_bonus")
    .eq("id", postId)
    .single();

  const { error } = await supabase
    .from("posts")
    .update({ revision_rounds_bonus: (post?.revision_rounds_bonus ?? 0) + 1 })
    .eq("id", postId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/beitraege/${postId}`);
}

export async function acceptDateProposal(postId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("proposed_publish_date")
    .eq("id", postId)
    .single();

  if (!post?.proposed_publish_date) throw new Error("Kein Terminvorschlag vorhanden");

  const { error } = await supabase
    .from("posts")
    .update({
      publish_date: post.proposed_publish_date,
      proposed_publish_date_status: "akzeptiert",
    })
    .eq("id", postId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/beitraege/${postId}`);
}

export async function rejectDateProposal(postId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ proposed_publish_date_status: "abgelehnt" })
    .eq("id", postId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/beitraege/${postId}`);
}
