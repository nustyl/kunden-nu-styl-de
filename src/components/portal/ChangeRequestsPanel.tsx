"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  deleteChangeRequest,
  editChangeRequest,
  setChangeRequestDone,
} from "@/lib/actions/change-requests";
import { formatDateTime } from "@/lib/format";
import type { ChangeItemView, ChangeRoundView } from "@/lib/change-requests";

interface Viewer {
  id: string;
  isAdmin: boolean;
}

const textareaClass =
  "w-full rounded-sm border border-ink-600 bg-ink-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

// Punkte einer Runde nach Bereich gruppieren (Allgemein, Slide 1, ...).
// Die Reihenfolge kommt bereits sortiert vom Server.
function groupBySection(items: ChangeItemView[]) {
  const groups: { key: string; label: string; items: ChangeItemView[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.key === item.section_key) last.items.push(item);
    else groups.push({ key: item.section_key, label: item.section_label, items: [item] });
  }
  return groups;
}

function ChangeItem({
  postId,
  item,
  viewer,
  roundOpen,
  isLastInRound,
}: {
  postId: string;
  item: ChangeItemView;
  viewer: Viewer;
  roundOpen: boolean;
  isLastInRound: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const own = !!item.author_id && item.author_id === viewer.id;
  const canEdit = viewer.isAdmin || (own && roundOpen);
  const canDelete = viewer.isAdmin || (own && roundOpen && !isLastInRound);
  const done = !!item.done_at;

  async function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      after?.();
      router.refresh();
    } catch {
      setError("Das hat leider nicht geklappt. Bitte versuch es erneut.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!text.trim()) return;
    run(() => editChangeRequest(postId, item.id, text), () => setEditing(false));
  }

  function remove() {
    if (!window.confirm(`„${item.category}“ wirklich aus den Änderungswünschen entfernen?`)) return;
    run(() => deleteChangeRequest(postId, item.id));
  }

  return (
    <details
      className={`group rounded-sm border bg-ink-900 ${
        done ? "border-ink-700 opacity-70" : "border-ink-600"
      }`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] ${
            done ? "border-green-500 bg-green-500/20 text-green-400" : "border-ink-500 text-transparent"
          }`}
        >
          ✓
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold">{item.category}</span>
            {item.is_supplement && (
              <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[11px] text-ink-300">
                Ergänzung
              </span>
            )}
            {done && (
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] text-green-400">
                Erledigt
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-ink-400 group-open:hidden">
            {item.body}
          </span>
        </span>
        <span aria-hidden className="flex-none text-ink-400 transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="grid gap-3 border-t border-ink-700 px-4 py-3">
        {editing ? (
          <div className="grid gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={Math.min(10, Math.max(3, text.split("\n").length + 1))}
              className={textareaClass}
              autoFocus
            />
            <p className="text-xs text-ink-400">
              Korrekturen ändern nichts an den genutzten Änderungsrunden.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setText(item.body);
                  setError(null);
                }}
                className="min-h-[40px] px-5"
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={busy || !text.trim()}
                onClick={save}
                className="min-h-[40px] px-5"
              >
                {busy ? "Speichere…" : "Speichern"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-paper/90">{item.body}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-500">
          <span>
            {item.author_name} · {formatDateTime(item.created_at)}
            {item.edited_at && (
              <span title={`Bearbeitet am ${formatDateTime(item.edited_at)}`}> · bearbeitet</span>
            )}
          </span>
          {!editing && (
            <span className="ml-auto flex flex-wrap items-center gap-3">
              {viewer.isAdmin && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => setChangeRequestDone(postId, item.id, !done))}
                  className={`rounded-full border px-3 py-1 font-semibold transition-colors disabled:opacity-50 ${
                    done
                      ? "border-ink-600 text-ink-300 hover:text-paper"
                      : "border-green-600 text-green-400 hover:bg-green-500/10"
                  }`}
                >
                  {done ? "Wieder öffnen" : "Als erledigt abhaken"}
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                  className="text-ink-500 transition-colors hover:text-paper disabled:opacity-50"
                >
                  Bearbeiten
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={remove}
                  className="text-ink-500 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  Entfernen
                </button>
              )}
            </span>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </details>
  );
}

function RoundItems({
  postId,
  round,
  viewer,
}: {
  postId: string;
  round: ChangeRoundView;
  viewer: Viewer;
}) {
  const roundOpen = round.resolved_at === null;
  const groups = groupBySection(round.items);
  const showGroupLabels = groups.some((g) => g.key !== "single");

  if (round.items.length === 0) {
    return <p className="text-sm text-ink-400">Keine Punkte in dieser Runde.</p>;
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <div key={group.key} className="grid gap-2">
          {showGroupLabels && (
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <ChangeItem
              key={item.id}
              postId={postId}
              item={item}
              viewer={viewer}
              roundOpen={roundOpen}
              isLastInRound={round.items.length <= 1}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function doneCount(round: ChangeRoundView) {
  return round.items.filter((i) => i.done_at).length;
}

// Fest verankertes Fenster mit allen Änderungswünschen eines Beitrags:
// die laufende Runde oben, abgeschlossene Runden darunter zum Aufklappen.
export function ChangeRequestsPanel({
  postId,
  rounds,
  viewer,
}: {
  postId: string;
  rounds: ChangeRoundView[];
  viewer: Viewer;
}) {
  if (rounds.length === 0) return null;

  const openRounds = rounds.filter((r) => r.resolved_at === null);
  const closedRounds = rounds.filter((r) => r.resolved_at !== null);

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Änderungswünsche</h2>
        <p className="text-xs text-ink-400">
          {viewer.isAdmin
            ? "Jeder Punkt einzeln aufklappbar. Hake erledigte Punkte ab, bevor du die Überarbeitung sendest."
            : "Jeder Punkt einzeln aufklappbar. Tippfehler kannst du korrigieren, solange die Runde läuft – das zählt nicht als neue Runde."}
        </p>
      </div>

      {openRounds.map((round) => {
        const done = doneCount(round);
        return (
          <div
            key={round.id}
            className="grid gap-4 rounded-md border border-orange-600 bg-orange-950/20 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display font-semibold">
                Runde {round.round_no}
                <span className="ml-2 text-xs font-normal text-ink-400">
                  {formatDateTime(round.created_at)}
                </span>
              </p>
              <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
                {viewer.isAdmin
                  ? `${done} von ${round.items.length} erledigt`
                  : "In Bearbeitung bei NU STYL"}
              </span>
            </div>
            <RoundItems postId={postId} round={round} viewer={viewer} />
          </div>
        );
      })}

      {closedRounds.length > 0 && (
        <div className="grid gap-2">
          {closedRounds.map((round) => (
            <details
              key={round.id}
              className="group rounded-md border border-ink-700 bg-ink-800"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">
                  Runde {round.round_no}
                  <span className="ml-2 font-normal text-ink-400">
                    {round.resolved_version
                      ? `umgesetzt in Version ${round.resolved_version}`
                      : "abgeschlossen"}{" "}
                    · {round.items.length} {round.items.length === 1 ? "Punkt" : "Punkte"}
                  </span>
                </span>
                <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <div className="border-t border-ink-700 p-4">
                <RoundItems postId={postId} round={round} viewer={viewer} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
