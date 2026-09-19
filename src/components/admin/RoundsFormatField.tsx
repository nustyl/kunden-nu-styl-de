"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/lib/ui-classes";

export function RoundsFormatField({
  name,
  label,
  defaultValue,
  defaultUnlimited,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  defaultUnlimited: boolean;
  placeholder: string;
}) {
  const [unlimited, setUnlimited] = useState(defaultUnlimited);

  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        defaultValue={defaultValue ?? ""}
        placeholder={unlimited ? "∞" : placeholder}
        disabled={unlimited}
        className={`${inputClass} disabled:opacity-50`}
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-300">
        <input
          type="checkbox"
          name={`${name}_unlimited`}
          checked={unlimited}
          onChange={(e) => setUnlimited(e.target.checked)}
          className="accent-orange-600"
        />
        unbegrenzt
      </label>
    </div>
  );
}
