"use client";

import { useRouter } from "next/navigation";

export interface StatusFilterOption {
  value: string;
  label: string;
  count: number;
}

// Auswahlfeld für den Status-Filter. Das Doppelpfeil-Symbol signalisiert
// "sortieren/filtern"; das Menü ist ein echtes <select> (am Handy nativ).
export function StatusFilterSelect({
  options,
  value,
  activeView,
}: {
  options: StatusFilterOption[];
  value: string;
  activeView: "karten" | "tabelle";
}) {
  const router = useRouter();

  function go(next: string) {
    const params = new URLSearchParams();
    if (next !== "alle") params.set("status", next);
    if (activeView === "tabelle") params.set("view", "tabelle");
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div className="relative inline-flex">
      <select
        aria-label="Beiträge nach Status filtern"
        value={value}
        onChange={(e) => go(e.target.value)}
        className="min-h-[48px] cursor-pointer appearance-none rounded-full border border-ink-600 bg-ink-800 py-2 pl-5 pr-12 text-sm font-medium text-paper transition-colors hover:border-ink-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-300"
      >
        <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
      </svg>
    </div>
  );
}
