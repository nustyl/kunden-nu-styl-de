import { deadlineUrgency, formatDate } from "@/lib/format";
import type { PostStatus } from "@/types/database";

const styles = {
  normal: "bg-ink-800 border-ink-600 text-ink-300",
  warning: "bg-orange-500/15 border-orange-500 text-orange-300",
  overdue: "bg-red-500/15 border-red-500 text-red-400",
};

const labels = {
  normal: "Freigabe bis",
  warning: "Freigabe fällig",
  overdue: "Freigabe-Frist überschritten",
};

const icons = {
  normal: "⏱",
  warning: "⚠",
  overdue: "⚠",
};

export function DeadlineBadge({
  deadline,
  status,
}: {
  deadline: string | null;
  status?: PostStatus;
}) {
  if (!deadline) return null;
  // Warnstufen nur, solange der Kunde noch freigeben muss.
  const urgency = status && status !== "zur_freigabe" ? "normal" : deadlineUrgency(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[urgency]}`}
    >
      <span aria-hidden>{icons[urgency]}</span>
      {labels[urgency]}: {formatDate(deadline)}
    </span>
  );
}
