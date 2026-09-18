import { formatFileSize } from "@/lib/format";

// Cloudflare R2 kostenloses Kontingent: 10 GB Speicher/Monat.
const FREE_TIER_BYTES = 10 * 1024 ** 3;

function barColor(ratio: number): string {
  if (ratio >= 0.9) return "bg-red-500";
  if (ratio >= 0.7) return "bg-orange-500";
  return "bg-green-500";
}

export function StorageBar({ usedBytes }: { usedBytes: number }) {
  const ratio = Math.min(1, usedBytes / FREE_TIER_BYTES);
  const percent = Math.round(ratio * 100);

  return (
    <div className="grid gap-1.5 w-full sm:w-64">
      <div className="flex items-center justify-between text-xs text-ink-300">
        <span>R2-Speicher (Medien)</span>
        <span>
          {formatFileSize(usedBytes)} von {formatFileSize(FREE_TIER_BYTES)} ({percent}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(ratio)}`}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
    </div>
  );
}
