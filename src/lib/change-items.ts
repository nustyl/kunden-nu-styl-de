import type { ChangeRequestInput } from "@/types/database";

// Eingehende Punkte (vom Browser) auf erwartete Form und Länge bringen.
// Die Datenbank prüft zusätzlich selbst.
export function cleanChangeItems(raw: unknown): ChangeRequestInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      section_key: String(x.section_key ?? "").trim().slice(0, 50),
      section_label: String(x.section_label ?? "").trim().slice(0, 100),
      category: String(x.category ?? "").trim().slice(0, 100),
      body: String(x.body ?? "").trim().slice(0, 5000),
    }))
    .filter((x) => x.section_key && x.category && x.body)
    .slice(0, 100);
}

// Für E-Mails: "Slide 2 · Design:\nText".
export function formatChangeItems(items: ChangeRequestInput[]): string {
  return items
    .map((i) => {
      const label =
        i.section_key === "single" ? i.category : `${i.section_label} · ${i.category}`;
      return `${label}:\n${i.body}`;
    })
    .join("\n\n");
}
