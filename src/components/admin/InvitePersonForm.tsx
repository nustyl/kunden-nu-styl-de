"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass } from "@/lib/ui-classes";

export function InvitePersonForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Person einladen"
        className="h-9 w-9 flex-none rounded-full bg-orange-600 text-white text-lg leading-none hover:shadow-brand hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center transition-all"
      >
        +
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError(null);
        try {
          const result = await action(formData);
          if (result.ok) setOpen(false);
          else setError(result.error);
        } catch {
          setError("Einladung fehlgeschlagen. Bitte erneut versuchen.");
        } finally {
          setPending(false);
        }
      }}
      className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end w-full"
    >
      <div>
        <label htmlFor="full_name" className={labelClass}>
          Name
        </label>
        <input id="full_name" name="full_name" className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          E-Mail
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Sende…" : "Einladen"}
      </Button>
      {error && <p className="text-sm text-red-400 sm:col-span-3">{error}</p>}
    </form>
  );
}
