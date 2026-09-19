import type { ComponentProps } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { MediaViewer } from "@/components/portal/MediaViewer";
import { ApprovalActions } from "@/components/portal/ApprovalActions";
import { CommentThread } from "@/components/portal/CommentThread";
import { DateProposalForm } from "@/components/portal/DateProposalForm";
import { formatDateTime } from "@/lib/format";
import { POST_FORMAT_LABELS, type Post } from "@/types/database";

export function PostDetailView({
  post,
  media,
  comments,
  viewer,
  roundsLimit,
}: {
  post: Post;
  media: { url: string; type: "image" | "video" }[];
  comments: ComponentProps<typeof CommentThread>["comments"];
  viewer: ComponentProps<typeof CommentThread>["viewer"];
  roundsLimit: number | null;
}) {
  const canRespond =
    post.status === "zur_freigabe" ||
    post.status === "aenderung_gewuenscht" ||
    post.status === "zurueckgestellt";

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        <Link href="/" className="text-sm text-ink-300 hover:text-paper">
          ← Alle Beiträge
        </Link>
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-orange-400">
              {POST_FORMAT_LABELS[post.format]}
            </span>
            <StatusBadge status={post.status} />
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {post.title}
          </h1>
        </div>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs font-semibold text-ink-300">
              <span aria-hidden>📅</span>
              Posting: {formatDateTime(post.publish_date)}
            </span>
            {canRespond && post.proposed_publish_date_status !== "offen" && (
              <DateProposalForm postId={post.id} currentDate={post.publish_date} />
            )}
          </div>
          <div>
            <DeadlineBadge deadline={post.approval_deadline} />
          </div>
          {post.proposed_publish_date_status === "offen" && (
            <p className="text-sm text-orange-300">
              Terminvorschlag &bdquo;{formatDateTime(post.proposed_publish_date)}&ldquo; wartet auf
              Bestätigung von NU STYL.
            </p>
          )}
          {post.proposed_publish_date_status === "abgelehnt" && (
            <p className="text-sm text-red-400">Dein letzter Terminvorschlag wurde abgelehnt.</p>
          )}
        </div>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <MediaViewer items={media} format={post.format} />
        </div>

        <div className="grid gap-10">
          {post.version > 1 && post.status === "zur_freigabe" && (
            <div className="rounded-sm border border-orange-600 bg-orange-950/20 p-4">
              <strong>Überarbeitete Version {post.version}:</strong> NU STYL hat den Beitrag anhand
              deiner Änderungswünsche überarbeitet. Bitte prüfe ihn erneut.
            </div>
          )}

          {(post.platforms.length > 0 || post.caption || post.hashtags) && (
            <div className="grid gap-4">
              {post.platforms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.platforms.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-ink-700 bg-ink-800 px-3 py-1 text-sm text-ink-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {post.caption && (
                <p className="whitespace-pre-wrap text-lg leading-relaxed">{post.caption}</p>
              )}
              {post.hashtags && (
                <p className="break-words text-base text-orange-400">{post.hashtags}</p>
              )}
            </div>
          )}

          {canRespond && (
            <div className="border-t border-ink-700 pt-8">
              <ApprovalActions
                postId={post.id}
                format={post.format}
                roundsUsed={post.revision_rounds_used}
                roundsLimit={roundsLimit}
                slides={media.map((m) => m.type)}
                status={post.status}
              />
            </div>
          )}

          <div className="border-t border-ink-700 pt-8">
            <CommentThread postId={post.id} comments={comments} viewer={viewer} />
          </div>
        </div>
      </div>
    </div>
  );
}
