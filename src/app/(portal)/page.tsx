import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2/presign";
import { PostCard } from "@/components/portal/PostCard";
import { PostsTable } from "@/components/portal/PostsTable";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { POST_STATUS_LABELS, type Post, type PostStatus } from "@/types/database";

const FILTERS: (PostStatus | "alle")[] = [
  "alle",
  "zur_freigabe",
  "freigegeben",
  "aenderung_gewuenscht",
  "zurueckgestellt",
  "veroeffentlicht",
];

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

  const { data: posts } = await query.returns<Post[]>();

  const postIds = (posts ?? []).map((p) => p.id);
  const { data: media } = postIds.length
    ? await supabase
        .from("post_media")
        .select("post_id, r2_key, type, sort_order")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const firstMediaByPost = new Map<string, { r2_key: string; type: "image" | "video" }>();
  for (const m of media ?? []) {
    if (!firstMediaByPost.has(m.post_id)) {
      firstMediaByPost.set(m.post_id, { r2_key: m.r2_key, type: m.type });
    }
  }

  const thumbs = new Map<string, string | null>();
  await Promise.all(
    Array.from(firstMediaByPost.entries()).map(async ([postId, m]) => {
      if (m.type === "image") {
        thumbs.set(postId, await presignGet(m.r2_key));
      }
    })
  );

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold mb-1">Deine Beiträge</h1>
          <p className="text-ink-300 text-sm">
            Sieh dir neue Reels & Beiträge an und gib sie frei.
          </p>
        </div>
        <ViewToggle
          view={activeView}
          baseHref="/"
          otherParams={activeFilter !== "alle" ? { status: activeFilter } : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={
              f === "alle"
                ? activeView === "tabelle"
                  ? "/?view=tabelle"
                  : "/"
                : `/?status=${f}${activeView === "tabelle" ? "&view=tabelle" : ""}`
            }
            className={`flex-none px-3 py-2 rounded-full text-sm border transition-colors ${
              activeFilter === f
                ? "bg-orange-600 border-orange-600 text-white"
                : "border-ink-600 text-ink-300 hover:text-paper"
            }`}
          >
            {f === "alle" ? "Alle" : POST_STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      {!posts || posts.length === 0 ? (
        <div className="rounded-md border border-ink-700 bg-ink-800 p-8 text-center text-ink-300">
          Aktuell keine Beiträge in dieser Ansicht.
        </div>
      ) : activeView === "tabelle" ? (
        <PostsTable posts={posts} />
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => {
            const m = firstMediaByPost.get(post.id);
            return (
              <PostCard
                key={post.id}
                post={post}
                thumbUrl={m ? thumbs.get(post.id) ?? null : null}
                thumbType={m?.type ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
