"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GermanDateTimeField } from "@/components/ui/GermanDateTimeField";
import { toDateTimeLocalValue } from "@/lib/format";

export function DateProposalForm({
  postId,
  currentDate,
}: {
  postId: string;
  currentDate: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!value) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/posts/${postId}/propose-date`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: value }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Etwas ist schiefgelaufen.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-ink-400 hover:text-orange-400 underline underline-offset-2"
      >
        Anderen Termin vorschlagen
      </button>
    );
  }

  return (
    <div className="grid gap-2 rounded-sm border border-ink-700 bg-ink-800 p-3">
      <label htmlFor="proposed-date" className="text-xs font-medium">
        Neuer Wunschtermin
      </label>
      <GermanDateTimeField
        id="proposed-date"
        defaultValue={toDateTimeLocalValue(currentDate)}
        onValueChange={setValue}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" disabled={loading || !value} onClick={submit}>
          {loading ? "Sende…" : "Vorschlagen"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
