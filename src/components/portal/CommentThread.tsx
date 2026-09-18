"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

interface CommentItem {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  is_admin: boolean;
  categories: string[] | null;
}

export function CommentThread({
  postId,
  comments,
}: {
  postId: string;
  comments: CommentItem[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, body }),
    });
    setLoading(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4">
      <h2 className="font-display font-semibold">Kommentare</h2>

      {comments.length === 0 ? (
        <p className="text-sm text-ink-300">Noch keine Kommentare.</p>
      ) : (
        <ul className="grid gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-sm border border-ink-700 bg-ink-800 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">
                  {c.author_name}
                  {c.is_admin && (
                    <span className="ml-2 text-xs text-orange-400 font-normal">NU STYL</span>
                  )}
                </span>
                <time className="text-xs text-ink-500">{formatDateTime(c.created_at)}</time>
              </div>
              {c.categories && c.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {c.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-orange-500/15 text-orange-300 text-xs px-2 py-0.5"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-ink-300 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="grid gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Kommentar schreiben…"
          className="rounded-sm border border-ink-600 bg-ink-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <Button variant="ghost" type="submit" disabled={loading || !body.trim()} className="justify-self-start">
          {loading ? "Sende…" : "Kommentieren"}
        </Button>
      </form>
    </div>
  );
}
