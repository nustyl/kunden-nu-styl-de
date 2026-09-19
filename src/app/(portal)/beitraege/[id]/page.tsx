import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { presignGet } from "@/lib/r2/presign";
import { PostDetailView } from "@/components/portal/PostDetailView";
import { getCurrentProfile } from "@/lib/auth";
import {
  maxRoundsForFormat,
  type Post,
  type PostMedia,
  type Comment,
  type Profile,
  type Client,
} from "@/types/database";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getCurrentProfile();

  const { data: post } = await supabase
    .from("posts")
    .select("*, clients ( max_revision_rounds, max_revision_rounds_by_format )")
    .eq("id", id)
    .single<
      Post & {
        clients: Pick<Client, "max_revision_rounds" | "max_revision_rounds_by_format"> | null;
      }
    >();

  if (!post) notFound();

  const { data: media } = await supabase
    .from("post_media")
    .select("*")
    .eq("post_id", id)
    .order("sort_order", { ascending: true })
    .returns<PostMedia[]>();

  const { data: rawComments } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .returns<Comment[]>();

  // Kunden dürfen laut RLS nur ihr eigenes Profil lesen. Name und Rolle der
  // Kommentar-Autoren (Admin, Kolleg:innen) holen wir daher serverseitig, und
  // geben nur diese beiden Felder für bereits sichtbare Kommentare weiter.
  const authorIds = [...new Set((rawComments ?? []).map((c) => c.author_id))];
  const { data: authors } =
    authorIds.length > 0
      ? await createAdminClient().from("profiles").select("id, full_name, role").in("id", authorIds)
      : { data: [] as Pick<Profile, "id" | "full_name" | "role">[] };
  const authorById = new Map((authors ?? []).map((a) => [a.id, a]));

  const mediaItems = await Promise.all(
    (media ?? []).map(async (m) => ({
      url: await presignGet(m.r2_key),
      type: m.type,
    }))
  );
  const validMedia = mediaItems.filter(
    (m): m is { url: string; type: "image" | "video" } => !!m.url
  );

  const comments = (rawComments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    author_id: c.author_id,
    author_name: authorById.get(c.author_id)?.full_name ?? "Unbekannt",
    is_admin: authorById.get(c.author_id)?.role === "admin",
    categories: c.categories,
    edited_at: c.edited_at,
  }));

  const maxRounds = post.clients ? maxRoundsForFormat(post.clients, post.format) : null;
  const roundsLimit = maxRounds === null ? null : maxRounds + post.revision_rounds_bonus;

  return (
    <PostDetailView
      post={post}
      media={validMedia}
      comments={comments}
      viewer={{
        id: session?.user.id ?? "",
        name: session?.profile.full_name ?? "Ich",
        isAdmin: session?.profile.role === "admin",
      }}
      roundsLimit={roundsLimit}
    />
  );
}
