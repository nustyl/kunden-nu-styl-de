import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { formatDate } from "@/lib/format";
import { POST_FORMAT_LABELS, mediaAspectClass, type Post } from "@/types/database";

interface PostCardProps {
  post: Post;
  thumbUrl: string | null;
  thumbType: "image" | "video" | null;
}

export function PostCard({ post, thumbUrl, thumbType }: PostCardProps) {
  return (
    <Link
      href={`/beitraege/${post.id}`}
      className="group flex gap-4 rounded-md border border-ink-700 bg-ink-800 p-3 hover:border-ink-600 transition-colors"
    >
      <div className={`w-20 ${mediaAspectClass(post.format)} flex-none rounded-sm overflow-hidden bg-ink-900`}>
        {thumbUrl ? (
          thumbType === "video" ? (
            // Kein <video> im Listen-Grid — sonst laden 5+ Videos gleichzeitig.
            // Statt Poster einfach ein Play-Icon auf dunklem Grund.
            <div className="w-full h-full flex items-center justify-center text-ink-500">
              ▶
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          )
        ) : null}
      </div>

      <div className="flex-1 min-w-0 grid gap-1 content-start">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-orange-400">
            {POST_FORMAT_LABELS[post.format]}
          </span>
          <StatusBadge status={post.status} />
        </div>
        <h3 className="font-display font-semibold truncate">{post.title}</h3>
        <p className="text-sm text-ink-300 truncate">{post.platforms.join(", ")}</p>
        <div className="flex items-center gap-3 flex-wrap text-xs mt-1">
          <span className="text-ink-300">Posting: {formatDate(post.publish_date)}</span>
          <DeadlineBadge deadline={post.approval_deadline} />
        </div>
      </div>
    </Link>
  );
}
