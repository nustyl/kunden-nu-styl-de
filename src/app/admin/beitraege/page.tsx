import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { PostsTable } from "@/components/admin/PostsTable";
import { PostsTableView } from "@/components/admin/PostsTableView";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/database";

const FILTERS: (PostStatus | "alle")[] = [
  "alle",
  "entwurf",
  "zur_freigabe",
  "freigegeben",
  "aenderung_gewuenscht",
  "zurueckgestellt",
  "veroeffentlicht",
];

export default async function AdminPostsPage({
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
    .select("*, clients ( name )")
    .order("publish_date", { ascending: true, nullsFirst: false });

  if (activeFilter !== "alle") query = query.eq("status", activeFilter);

  const { data: posts } = await query;

  const rows = (posts ?? []).map((p) => ({
    ...p,
    clientName: (p as unknown as { clients: { name: string } | null }).clients?.name ?? "—",
  }));

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-semibold">Beiträge</h1>
        <div className="flex items-center gap-3">
          <ViewToggle
            view={activeView}
            baseHref="/admin/beitraege"
            otherParams={activeFilter !== "alle" ? { status: activeFilter } : undefined}
          />
          <Link href="/admin/beitraege/neu">
            <Button variant="primary">Beitrag anlegen</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={
              f === "alle"
                ? activeView === "tabelle"
                  ? "/admin/beitraege?view=tabelle"
                  : "/admin/beitraege"
                : `/admin/beitraege?status=${f}${activeView === "tabelle" ? "&view=tabelle" : ""}`
            }
            className={`flex-none px-4 py-2 rounded-full text-sm border transition-colors ${
              activeFilter === f
                ? "bg-orange-600 border-orange-600 text-white"
                : "border-ink-600 text-ink-300 hover:text-paper"
            }`}
          >
            {f === "alle" ? "Alle" : POST_STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-300">Keine Beiträge in dieser Ansicht.</p>
      ) : activeView === "tabelle" ? (
        <PostsTableView posts={rows} />
      ) : (
        <PostsTable posts={rows} />
      )}
    </div>
  );
}
