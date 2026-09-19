"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { batchSetStatus } from "@/lib/actions/admin";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { POST_FORMAT_LABELS, POST_STATUS_LABELS, type Post, type PostStatus } from "@/types/database";

interface Row extends Post {
  clientName: string;
}

const BATCH_STATUSES: PostStatus[] = [
  "entwurf",
  "zur_freigabe",
  "freigegeben",
  "aenderung_gewuenscht",
  "zurueckgestellt",
  "veroeffentlicht",
];

export function PostsTableView({ posts }: { posts: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetStatus, setTargetStatus] = useState<PostStatus>("zur_freigabe");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === posts.length ? new Set() : new Set(posts.map((p) => p.id))));
  }

  function runBatch() {
    startTransition(async () => {
      await batchSetStatus(Array.from(selected), targetStatus);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-sm border border-orange-600 bg-orange-950/30 p-3">
          <span className="text-sm">{selected.size} ausgewählt</span>
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value as PostStatus)}
            className="min-h-[40px] px-3 rounded-sm border border-ink-600 bg-ink-900 text-paper text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {BATCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={runBatch} disabled={isPending}>
            {isPending ? "Setze…" : "Status setzen"}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-ink-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-ink-800 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === posts.length && posts.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-orange-600"
                  aria-label="Alle auswählen"
                />
              </th>
              <th className="px-3 py-2 font-medium">Titel</th>
              <th className="px-3 py-2 font-medium">Kunde</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Posting</th>
              <th className="px-3 py-2 font-medium">Frist</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-ink-700 hover:bg-ink-800/60 transition-colors">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggle(post.id)}
                    className="h-4 w-4 accent-orange-600"
                    aria-label={`${post.title} auswählen`}
                  />
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/beitraege/${post.id}`} className="font-medium hover:text-orange-400">
                    {post.title}
                  </Link>
                </td>
                <td className="px-3 py-2 text-ink-300">{post.clientName}</td>
                <td className="px-3 py-2 text-ink-300">{POST_FORMAT_LABELS[post.format]}</td>
                <td className="px-3 py-2 text-ink-300 whitespace-nowrap">
                  {formatDateTime(post.publish_date)}
                </td>
                <td className="px-3 py-2">
                  <DeadlineBadge deadline={post.approval_deadline} status={post.status} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={post.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
