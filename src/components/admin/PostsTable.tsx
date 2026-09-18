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

export function PostsTable({ posts }: { posts: Row[] }) {
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

      <div className="grid gap-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center gap-3 rounded-sm border border-ink-700 bg-ink-800 p-3"
          >
            <input
              type="checkbox"
              checked={selected.has(post.id)}
              onChange={() => toggle(post.id)}
              className="h-5 w-5 accent-orange-600 flex-none"
              aria-label={`${post.title} auswählen`}
            />
            <Link href={`/admin/beitraege/${post.id}`} className="flex-1 min-w-0 grid gap-0.5">
              <span className="text-xs uppercase tracking-wide text-orange-400">
                {POST_FORMAT_LABELS[post.format]} · {post.clientName}
              </span>
              <span className="font-medium truncate">{post.title}</span>
              <span className="text-xs text-ink-400">
                Posting {formatDateTime(post.publish_date)}
              </span>
            </Link>
            <DeadlineBadge deadline={post.approval_deadline} />
            <StatusBadge status={post.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
