"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { changeSectionsFor, type MediaType, type PostFormat, type PostStatus } from "@/types/database";

interface ApprovalActionsProps {
  postId: string;
  format: PostFormat;
  roundsUsed: number;
  roundsLimit: number | null; // effektives Limit (Kunde + Admin-Bonus), null = unbegrenzt
  slides: MediaType[]; // Medientyp je Slide, in Anzeige-Reihenfolge
  status: PostStatus;
}

const BILLING_NOTICE = (formatLabel: string) =>
  `Das Zurückstellen dieses ${formatLabel}s wird laut Vertrag nicht in der Rechnungsstellung berücksichtigt.`;

const FORMAT_NOUN: Record<PostFormat, string> = {
  reel: "Reel",
  beitrag: "Beitrag",
  karussell: "Beitrag",
  story: "Story",
};

export function ApprovalActions({
  postId,
  format,
  roundsUsed,
  roundsLimit,
  slides,
  status,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "change" | "defer">("idle");
  const [categoryTexts, setCategoryTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Änderungswünsche liegen bei NU STYL: keine Freigabe / neue Runde, nur Ergänzen.
  const locked = status === "aenderung_gewuenscht";

  const roundsLeft = roundsLimit === null ? null : Math.max(0, roundsLimit - roundsUsed);
  const hasRoundsLeft = roundsLeft === null || roundsLeft > 0;
  const { carousel, sections } = changeSectionsFor(format, slides);

  const entries = sections.flatMap((section) =>
    section.categories.flatMap((cat) => {
      const text = categoryTexts[`${section.key}::${cat}`]?.trim();
      if (!text) return [];
      const label = carousel ? `${section.label} · ${cat}` : cat;
      return [{ label, text }];
    })
  );
  const filledCategories = entries.map((e) => e.label);
  const combinedComment = entries.map((e) => `${e.label}:\n${e.text}`).join("\n\n");

  function setCategoryText(key: string, value: string) {
    setCategoryTexts((prev) => ({ ...prev, [key]: value }));
  }

  function filledCount(sectionKey: string) {
    return Object.entries(categoryTexts).filter(
      ([k, v]) => k.startsWith(`${sectionKey}::`) && v.trim()
    ).length;
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

  async function submitSupplement() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, body: combinedComment, categories: filledCategories }),
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
        <div className="grid gap-3">
          {locked && (
            <p className="text-xs text-orange-300">
              Etwas vergessen? Ergänze es hier. Das zählt nicht als neue Änderungsrunde.
            </p>
          )}
          {carousel && <h3 className="font-display font-semibold">Änderungswünsche</h3>}
          <p className="text-xs text-ink-400">
            {carousel
              ? "Klapp Allgemein oder einen Slide auf und trag ein, was geändert werden soll. Leer lassen, was nicht betroffen ist."
              : "Trag bei jedem zutreffenden Punkt ein, was genau geändert werden soll. Leer lassen, was nicht betroffen ist."}
          </p>
          {sections.map((section, index) => {
            const count = filledCount(section.key);
            return (
              <details
                key={section.key}
                open={index === 0}
                className="group rounded-sm border border-ink-700 bg-ink-900"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>{section.label}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-400">
                    {count > 0 && (
                      <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-orange-300">
                        {count} {count === 1 ? "Anmerkung" : "Anmerkungen"}
                      </span>
                    )}
                    <span aria-hidden className="transition-transform group-open:rotate-180">
                      ⌄
                    </span>
                  </span>
                </summary>
                <div className="grid gap-3 px-4 pb-4">
                  {section.categories.map((cat) => {
                    const id = `cat-${section.key}-${cat}`;
                    return (
                      <div key={cat}>
                        <label htmlFor={id} className="mb-1 block text-sm font-medium">
                          {cat}
                        </label>
                        <textarea
                          id={id}
                          value={categoryTexts[`${section.key}::${cat}`] ?? ""}
                          onChange={(e) => setCategoryText(`${section.key}::${cat}`, e.target.value)}
                          rows={2}
                          placeholder={`Was soll bei „${cat}“ geändert werden?`}
                          className="w-full rounded-sm border border-ink-600 bg-ink-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={loading || entries.length === 0}
            onClick={() => (locked ? submitSupplement() : submit("aenderung_gewuenscht"))}
          >
            {loading ? "Sende…" : locked ? "Ergänzung senden" : "Änderungswunsch senden"}
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

  if (locked) {
    return (
      <div className="grid gap-3 rounded-md border border-orange-600 bg-orange-950/20 p-4">
        <div>
          <p className="text-sm font-medium">Deine Änderungswünsche werden bearbeitet.</p>
          <p className="text-xs text-ink-300">
            Du bekommst eine E-Mail, sobald die Überarbeitung bereit ist. Freigeben oder eine neue
            Änderungsrunde ist bis dahin nicht möglich.
          </p>
        </div>
        {roundsInfo}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <Button variant="ghost" onClick={() => setMode("change")}>
            Änderungswunsch ergänzen
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
