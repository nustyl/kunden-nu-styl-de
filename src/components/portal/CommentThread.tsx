"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { deleteComment, editComment } from "@/lib/actions/comments";
import { formatDateTime } from "@/lib/format";

interface CommentItem {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
  author_name: string;
  is_admin: boolean;
  categories: string[] | null;
}

const ADMIN_NAME = "Luc Picard";
const ADMIN_AVATAR = "/luc-picard.jpg";

const textareaClass =
  "w-full rounded-sm border border-ink-600 bg-ink-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function Avatar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  if (isAdmin) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={ADMIN_AVATAR}
        alt={ADMIN_NAME}
        width={44}
        height={44}
        className="h-11 w-11 flex-none rounded-full object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="h-11 w-11 flex-none rounded-full bg-ink-700 text-ink-300 text-sm font-semibold flex items-center justify-center"
    >
      {initials(name)}
    </div>
  );
}

export function CommentThread({
  postId,
  comments,
  viewer,
}: {
  postId: string;
  comments: CommentItem[];
  viewer: { id: string; name: string; isAdmin: boolean };
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  function startEdit(comment: CommentItem) {
    setError(null);
    setEditingId(comment.id);
    setEditText(comment.body);
  }

  async function saveEdit(commentId: string) {
    if (!editText.trim()) return;
    setBusyId(commentId);
    setError(null);
    try {
      await editComment(postId, commentId, editText);
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Kommentar konnte nicht gespeichert werden.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("Diesen Kommentar wirklich löschen?")) return;
    setBusyId(commentId);
    setError(null);
    try {
      await deleteComment(postId, commentId);
      router.refresh();
    } catch {
      setError("Kommentar konnte nicht gelöscht werden.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, body }),
    });
    setLoading(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kommentar konnte nicht gesendet werden.");
    }
  }

  return (
    <div className="grid gap-4">
      <h2 className="font-display font-semibold">Kommentare</h2>

      {comments.length === 0 ? (
        <p className="text-sm text-ink-300">Noch keine Kommentare.</p>
      ) : (
        <ul className="grid gap-3">
          {comments.map((c) => {
            const name = c.is_admin ? ADMIN_NAME : c.author_name;
            const canManage = viewer.isAdmin || c.author_id === viewer.id;
            const editing = editingId === c.id;
            const busy = busyId === c.id;
            return (
              <li
                key={c.id}
                className="flex gap-3 rounded-md border border-ink-700 bg-ink-800 p-4"
              >
                <Avatar name={name} isAdmin={c.is_admin} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-x-2 flex-wrap">
                    <span className="font-semibold">{name}</span>
                    {c.is_admin && (
                      <span className="text-xs font-semibold text-orange-400">NU STYL</span>
                    )}
                    <time className="text-xs text-ink-500">· {formatDateTime(c.created_at)}</time>
                    {c.edited_at && (
                      <span
                        className="text-xs text-ink-500"
                        title={`Bearbeitet am ${formatDateTime(c.edited_at)}`}
                      >
                        · bearbeitet
                      </span>
                    )}
                    {canManage && !editing && (
                      <span className="ml-auto flex gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          disabled={busy}
                          className="text-ink-500 hover:text-paper disabled:opacity-50 transition-colors"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={busy}
                          className="text-ink-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                        >
                          {busy ? "Lösche…" : "Löschen"}
                        </button>
                      </span>
                    )}
                  </div>
                  {c.categories && c.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
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
                  {editing ? (
                    <div className="mt-2 grid gap-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={Math.min(10, Math.max(3, editText.split("\n").length + 1))}
                        className={textareaClass}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                          className="min-h-[40px] px-5"
                        >
                          Abbrechen
                        </Button>
                        <Button
                          variant="primary"
                          type="button"
                          onClick={() => saveEdit(c.id)}
                          disabled={busy || !editText.trim()}
                          className="min-h-[40px] px-5"
                        >
                          {busy ? "Speichere…" : "Speichern"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-paper/90 whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <Avatar name={viewer.isAdmin ? ADMIN_NAME : viewer.name} isAdmin={viewer.isAdmin} />
        <div className="flex-1 grid gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Kommentar schreiben…"
            className={textareaClass}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            variant="primary"
            type="submit"
            disabled={loading || !body.trim()}
            className="justify-self-end min-h-[40px] px-5"
          >
            {loading ? "Sende…" : "Kommentieren"}
          </Button>
        </div>
      </form>
    </div>
  );
}
