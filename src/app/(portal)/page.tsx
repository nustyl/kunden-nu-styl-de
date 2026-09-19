import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2/presign";
import { PortalOverview, type MediaInfo } from "@/components/portal/PortalOverview";
import type { Post, PostStatus } from "@/types/database";

export default async function PortalHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { status, view } = await searchParams;
  const activeFilter = (status as PostStatus | undefined) ?? "alle";
  const activeView = view === "tabelle" ? "tabelle" : "karten";

  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*")
    .order("publish_date", { ascending: true, nullsFirst: false });

  if (activeFilter !== "alle") {
    query = query.eq("status", activeFilter);
  }

  const [{ data: posts }, { data: statusRows }] = await Promise.all([
    query.returns<Post[]>(),
    supabase.from("posts").select("status"),
  ]);

  const counts: Partial<Record<PostStatus, number>> = {};
  for (const row of (statusRows ?? []) as { status: PostStatus }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  const postIds = (posts ?? []).map((p) => p.id);
  const { data: media } = postIds.length
    ? await supabase
        .from("post_media")
        .select("post_id, r2_key, type, sort_order")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const liveMedia = (media ?? []).filter((m) => !m.r2_key.startsWith("deleted/"));
  const firstByPost = new Map<string, { r2_key: string; type: "image" | "video" }>();
  const countByPost = new Map<string, number>();
  for (const m of liveMedia) {
    countByPost.set(m.post_id, (countByPost.get(m.post_id) ?? 0) + 1);
    if (!firstByPost.has(m.post_id)) firstByPost.set(m.post_id, { r2_key: m.r2_key, type: m.type });
  }

  const mediaInfo: Record<string, MediaInfo> = {};
  await Promise.all(
    Array.from(firstByPost.entries()).map(async ([postId, m]) => {
      mediaInfo[postId] = {
        thumbUrl: m.type === "image" ? await presignGet(m.r2_key) : null,
        type: m.type,
        count: countByPost.get(postId) ?? 1,
      };
    })
  );

  return (
    <PortalOverview
      posts={posts ?? []}
      mediaInfo={mediaInfo}
      counts={counts}
      total={statusRows?.length ?? 0}
      activeFilter={activeFilter}
      activeView={activeView}
    />
  );
}
