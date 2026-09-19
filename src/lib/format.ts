export const PORTAL_TIME_ZONE = "Europe/Berlin";

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: PORTAL_TIME_ZONE,
  });
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: PORTAL_TIME_ZONE,
  });
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// Wanduhrzeit einer Zeitangabe in Europa/Berlin als Zahlen (unabhängig davon,
// in welcher Zeitzone Server bzw. Browser laufen).
function berlinParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PORTAL_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

// Für <input type="datetime-local">: "YYYY-MM-DDTHH:mm" in deutscher Zeit.
export function toDateTimeLocalValue(value: string | null): string {
  if (!value) return "";
  const { y, mo, d, h, mi } = berlinParts(new Date(value));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}`;
}

// Gegenstück: Eingabe aus datetime-local (deutsche Zeit) -> ISO-String (UTC).
export function berlinLocalToISO(local: string | null | undefined): string | null {
  if (!local) return null;
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let instant = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    const p = berlinParts(new Date(instant));
    const shown = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
    instant += wallAsUtc - shown;
  }
  return new Date(instant).toISOString();
}

// Tage bis zu einem Datum, gerechnet in deutscher Zeit (Server läuft in UTC).
export function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const now = berlinParts(new Date());
  const today = Date.UTC(now.y, now.mo - 1, now.d);
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let target: number;
  if (dateOnly) {
    target = Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  } else {
    const p = berlinParts(new Date(value));
    target = Date.UTC(p.y, p.mo - 1, p.d);
  }
  return Math.round((target - today) / 86_400_000);
}

export type DeadlineUrgency = "normal" | "warning" | "overdue";

export function deadlineUrgency(value: string | null): DeadlineUrgency {
  const days = daysUntil(value);
  if (days === null) return "normal";
  if (days < 0) return "overdue";
  if (days <= 2) return "warning";
  return "normal";
}
