import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { formatDateTime } from "@/lib/format";
import { POST_FORMAT_LABELS, type Post } from "@/types/database";

interface PostCardProps {
  post: Post;
  thumbUrl: string | null;
  thumbType: "image" | "video" | null;
  mediaCount: number;
}

export function PostCard({ post, thumbUrl, thumbType, mediaCount }: PostCardProps) {
  return (
    <Link
      href={`/beitraege/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-ink-700 bg-ink-800 transition-all hover:-translate-y-0.5 hover:border-ink-500 hover:shadow-md"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-900">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          // Kein <video> im Listen-Grid — sonst laden viele Videos gleichzeitig.
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-700 to-ink-900 text-ink-500">
            <span className="text-4xl" aria-hidden>
              {thumbType === "video" ? "▶" : "▢"}
            </span>
            <span className="text-sm">{thumbType === "video" ? "Video" : "Noch kein Medium"}</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-ink-900/90 backdrop-blur">
            <StatusBadge status={post.status} />
          </span>
          {mediaCount > 1 && (
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {mediaCount} Slides
            </span>
          )}
        </div>
      </div>

      <div className="grid flex-1 content-start gap-3 p-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
            {POST_FORMAT_LABELS[post.format]}
            {post.platforms.length > 0 && (
              <span className="font-medium normal-case tracking-normal text-ink-500">
                {" "}
                · {post.platforms.join(", ")}
              </span>
            )}
          </p>
          <h3 className="font-display text-xl font-semibold leading-snug">{post.title}</h3>
        </div>
        <div className="grid gap-2 text-sm">
          <span className="text-ink-300">Posting: {formatDateTime(post.publish_date)}</span>
          <div>
            <DeadlineBadge deadline={post.approval_deadline} />
          </div>
        </div>
      </div>
    </Link>
  );
}
