import { POST_STATUS_LABELS, type PostStatus } from "@/types/database";

const styles: Record<PostStatus, string> = {
  entwurf: "bg-ink-700 text-ink-300",
  zur_freigabe: "bg-orange-500/15 text-orange-300",
  freigegeben: "bg-green-500/15 text-green-400",
  aenderung_gewuenscht: "bg-red-500/15 text-red-400",
  zurueckgestellt: "bg-orange-700/20 text-orange-200",
  veroeffentlicht: "bg-ink-600 text-paper",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${styles[status]}`}
    >
      {POST_STATUS_LABELS[status]}
    </span>
  );
}
