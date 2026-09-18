import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StorageBar } from "@/components/admin/StorageBar";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Post, Comment } from "@/types/database";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const inTwoDays = new Date();
  inTwoDays.setDate(inTwoDays.getDate() + 2);
  const inTwoDaysStr = inTwoDays.toISOString().slice(0, 10);

  const [
    { data: openApprovals },
    { data: expiringSoon },
    { data: changeRequests },
    { data: deferred },
    { data: dateProposals },
    { data: recentComments },
    { data: mediaRows },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("*, clients ( name )")
      .eq("status", "zur_freigabe")
      .order("approval_deadline", { ascending: true }),
    supabase
      .from("posts")
      .select("*, clients ( name )")
      .eq("status", "zur_freigabe")
      .lte("approval_deadline", inTwoDaysStr)
      .order("approval_deadline", { ascending: true }),
    supabase
      .from("posts")
      .select("*, clients ( name )")
      .eq("status", "aenderung_gewuenscht")
      .order("updated_at", { ascending: false }),
    supabase
      .from("posts")
      .select("*, clients ( name )")
      .eq("status", "zurueckgestellt")
      .order("updated_at", { ascending: false }),
    supabase
      .from("posts")
      .select("*, clients ( name )")
      .eq("proposed_publish_date_status", "offen")
      .order("updated_at", { ascending: false }),
    supabase
      .from("comments")
      .select("*, posts ( title ), profiles ( full_name, role )")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("post_media").select("size, r2_key"),
  ]);

  const totalBytes = (mediaRows ?? [])
    .filter((m) => !m.r2_key.startsWith("deleted/"))
    .reduce((sum, m) => sum + (m.size ?? 0), 0);

  type PostWithClient = Post & { clients: { name: string } | null };
  type CommentWithRel = Comment & {
    posts: { title: string } | null;
    profiles: { full_name: string | null; role: string } | null;
  };

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-display font-semibold">Dashboard</h1>
        <StorageBar usedBytes={totalBytes} />
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-md border border-ink-700 bg-ink-800 p-4">
          <p className="text-3xl font-display font-semibold">{openApprovals?.length ?? 0}</p>
          <p className="text-sm text-ink-300">Offene Freigaben</p>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-800 p-4">
          <p className="text-3xl font-display font-semibold text-orange-400">
            {expiringSoon?.length ?? 0}
          </p>
          <p className="text-sm text-ink-300">Fristen ≤ 2 Tage</p>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-800 p-4">
          <p className="text-3xl font-display font-semibold text-red-400">
            {changeRequests?.length ?? 0}
          </p>
          <p className="text-sm text-ink-300">Änderungswünsche</p>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-800 p-4">
          <p className="text-3xl font-display font-semibold text-orange-200">
            {deferred?.length ?? 0}
          </p>
          <p className="text-sm text-ink-300">Zurückgestellt</p>
        </div>
      </div>

      {dateProposals && dateProposals.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-display font-semibold">Offene Terminvorschläge</h2>
          <div className="grid gap-2">
            {(dateProposals as PostWithClient[]).map((post) => (
              <Link
                key={post.id}
                href={`/admin/beitraege/${post.id}`}
                className="flex items-center justify-between gap-3 rounded-sm border border-orange-600 bg-orange-950/20 p-3 hover:border-orange-500"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{post.title}</p>
                  <p className="text-sm text-ink-300 truncate">
                    {post.clients?.name} · neuer Termin:{" "}
                    {formatDateTime(post.proposed_publish_date)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-display font-semibold">Offene Freigaben & Änderungswünsche</h2>
        {[...(openApprovals ?? []), ...(changeRequests ?? [])].length === 0 ? (
          <p className="text-sm text-ink-300">Aktuell nichts offen.</p>
        ) : (
          <div className="grid gap-2">
            {[...(openApprovals as PostWithClient[] ?? []), ...(changeRequests as PostWithClient[] ?? [])].map(
              (post) => (
                <Link
                  key={post.id}
                  href={`/admin/beitraege/${post.id}`}
                  className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-ink-800 p-3 hover:border-ink-600"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{post.title}</p>
                    <p className="text-sm text-ink-300 truncate">
                      {post.clients?.name} · Frist {formatDate(post.approval_deadline)}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </Link>
              )
            )}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-display font-semibold">Neue Kommentare</h2>
        {!recentComments || recentComments.length === 0 ? (
          <p className="text-sm text-ink-300">Noch keine Kommentare.</p>
        ) : (
          <div className="grid gap-2">
            {(recentComments as CommentWithRel[]).map((c) => (
              <div key={c.id} className="rounded-sm border border-ink-700 bg-ink-800 p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-medium">
                    {c.profiles?.full_name ?? "Unbekannt"} · {c.posts?.title}
                  </span>
                  <time className="text-xs text-ink-500">{formatDateTime(c.created_at)}</time>
                </div>
                <p className="text-sm text-ink-300 truncate">{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
