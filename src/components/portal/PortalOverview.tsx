import { PostCard } from "@/components/portal/PostCard";
import { PostsTable } from "@/components/portal/PostsTable";
import { StatusFilterSelect } from "@/components/portal/StatusFilterSelect";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { POST_STATUS_LABELS, type Post, type PostStatus } from "@/types/database";

export const PORTAL_FILTERS: (PostStatus | "alle")[] = [
  "alle",
  "zur_freigabe",
  "freigegeben",
  "aenderung_gewuenscht",
  "zurueckgestellt",
  "veroeffentlicht",
];

export interface MediaInfo {
  thumbUrl: string | null;
  type: "image" | "video" | null;
  count: number;
}

export function PortalOverview({
  posts,
  mediaInfo,
  counts,
  total,
  activeFilter,
  activeView,
}: {
  posts: Post[];
  mediaInfo: Record<string, MediaInfo>;
  counts: Partial<Record<PostStatus, number>>;
  total: number;
  activeFilter: PostStatus | "alle";
  activeView: "karten" | "tabelle";
}) {
  const openCount = counts.zur_freigabe ?? 0;

  const filterOptions = PORTAL_FILTERS.map((f) => ({
    value: f,
    label: f === "alle" ? "Alle" : POST_STATUS_LABELS[f],
    count: f === "alle" ? total : (counts[f] ?? 0),
  }));

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-orange-400">
            Kundenportal
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
            Deine Beiträge
          </h1>
          <p className="mt-3 text-lg text-ink-300">
            {openCount > 0
              ? openCount === 1
                ? "Ein Beitrag wartet auf deine Freigabe."
                : `${openCount} Beiträge warten auf deine Freigabe.`
              : "Aktuell wartet nichts auf deine Freigabe."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusFilterSelect options={filterOptions} value={activeFilter} activeView={activeView} />
          <ViewToggle
            view={activeView}
            baseHref="/"
            otherParams={activeFilter !== "alle" ? { status: activeFilter } : undefined}
          />
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-md border border-ink-700 bg-ink-800 p-12 text-center text-lg text-ink-300">
          Aktuell keine Beiträge in dieser Ansicht.
        </div>
      ) : activeView === "tabelle" ? (
        <PostsTable posts={posts} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const info = mediaInfo[post.id];
            return (
              <PostCard
                key={post.id}
                post={post}
                thumbUrl={info?.thumbUrl ?? null}
                thumbType={info?.type ?? null}
                mediaCount={info?.count ?? 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
