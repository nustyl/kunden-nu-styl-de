"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { changeCategoriesFor, type PostFormat } from "@/types/database";

interface ApprovalActionsProps {
  postId: string;
  format: PostFormat;
  roundsUsed: number;
  roundsLimit: number | null; // effektives Limit (Kunde + Admin-Bonus), null = unbegrenzt
}

const BILLING_NOTICE = (formatLabel: string) =>
  `Das Zurückstellen dieses ${formatLabel}s wird laut Vertrag nicht in der Rechnungsstellung berücksichtigt.`;

const FORMAT_NOUN: Record<PostFormat, string> = {
  reel: "Reel",
  beitrag: "Beitrag",
  karussell: "Beitrag",
  story: "Story",
};

export function ApprovalActions({ postId, format, roundsUsed, roundsLimit }: ApprovalActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "change" | "defer">("idle");
  const [categoryTexts, setCategoryTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundsLeft = roundsLimit === null ? null : Math.max(0, roundsLimit - roundsUsed);
  const hasRoundsLeft = roundsLeft === null || roundsLeft > 0;
  const availableCategories = changeCategoriesFor(format);

  const filledCategories = availableCategories.filter((cat) => categoryTexts[cat]?.trim());
  const combinedComment = filledCategories
    .map((cat) => `${cat}:\n${categoryTexts[cat]!.trim()}`)
    .join("\n\n");

  function setCategoryText(cat: string, value: string) {
    setCategoryTexts((prev) => ({ ...prev, [cat]: value }));
  }

  async function submit(status: "freigegeben" | "aenderung_gewuenscht" | "zurueckgestellt") {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        comment: status === "aenderung_gewuenscht" ? combinedComment : undefined,
        categories: status === "aenderung_gewuenscht" ? filledCategories : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Etwas ist schiefgelaufen.");
      return;
    }
    setMode("idle");
    setCategoryTexts({});
    router.refresh();
  }

  const roundsInfo = (
    <p className="text-xs text-ink-400">
      Änderungsrunden: {roundsUsed} von {roundsLimit === null ? "∞" : roundsLimit} genutzt
      {roundsLimit !== null && !hasRoundsLeft && " — keine Runden mehr übrig"}
    </p>
  );

  if (mode === "change") {
    return (
      <div className="grid gap-4 rounded-md border border-ink-700 bg-ink-800 p-4">
        {roundsInfo}
        <div>
          <p className="text-sm font-medium mb-1">Was betrifft die Änderung?</p>
          <p className="text-xs text-ink-400 mb-3">
            Trag bei jedem zutreffenden Punkt ein, was genau geändert werden soll. Leer lassen,
            was nicht betroffen ist.
          </p>
          <div className="grid gap-3">
            {availableCategories.map((cat) => (
              <div key={cat}>
                <label htmlFor={`cat-${cat}`} className="text-sm font-medium mb-1 block">
                  {cat}
                </label>
                <textarea
                  id={`cat-${cat}`}
                  value={categoryTexts[cat] ?? ""}
                  onChange={(e) => setCategoryText(cat, e.target.value)}
                  rows={2}
                  placeholder={`Was soll bei „${cat}“ geändert werden?`}
                  className="w-full rounded-sm border border-ink-600 bg-ink-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={loading || filledCategories.length === 0}
            onClick={() => submit("aenderung_gewuenscht")}
          >
            {loading ? "Sende…" : "Änderungswunsch senden"}
          </Button>
          <Button variant="ghost" onClick={() => setMode("idle")}>
            Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "defer") {
    return (
      <div className="grid gap-3 rounded-md border border-orange-600 bg-orange-950/20 p-4">
        <p className="text-sm">{BILLING_NOTICE(FORMAT_NOUN[format])}</p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button variant="primary" disabled={loading} onClick={() => submit("zurueckgestellt")}>
            {loading ? "Sende…" : "Trotzdem zurückstellen"}
          </Button>
          <Button variant="ghost" onClick={() => setMode("idle")}>
            Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {roundsInfo}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" disabled={loading} onClick={() => submit("freigegeben")}>
          Freigeben
        </Button>
        {hasRoundsLeft ? (
          <Button variant="ghost" disabled={loading} onClick={() => setMode("change")}>
            Änderung gewünscht
          </Button>
        ) : (
          <Button variant="ghost" disabled={loading} onClick={() => setMode("defer")}>
            Zurückstellen
          </Button>
        )}
      </div>
    </div>
  );
}
