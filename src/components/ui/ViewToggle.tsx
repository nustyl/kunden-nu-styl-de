import Link from "next/link";

export function ViewToggle({
  view,
  baseHref,
  otherParams,
}: {
  view: "karten" | "tabelle";
  baseHref: string;
  otherParams?: Record<string, string>;
}) {
  function hrefFor(v: "karten" | "tabelle") {
    const params = new URLSearchParams(otherParams);
    if (v !== "karten") params.set("view", v);
    const qs = params.toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  }

  return (
    <div className="inline-flex rounded-full border border-ink-600 p-1 text-sm">
      <Link
        href={hrefFor("karten")}
        className={`px-4 py-2 rounded-full transition-colors ${
          view === "karten" ? "bg-orange-600 text-white" : "text-ink-300 hover:text-paper"
        }`}
      >
        Karten
      </Link>
      <Link
        href={hrefFor("tabelle")}
        className={`px-4 py-2 rounded-full transition-colors ${
          view === "tabelle" ? "bg-orange-600 text-white" : "text-ink-300 hover:text-paper"
        }`}
      >
        Tabelle
      </Link>
    </div>
  );
}
