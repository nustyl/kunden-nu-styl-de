import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2/presign";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { MediaViewer } from "@/components/portal/MediaViewer";
import { ApprovalActions } from "@/components/portal/ApprovalActions";
import { CommentThread } from "@/components/portal/CommentThread";
import { DateProposalForm } from "@/components/portal/DateProposalForm";
import { getCurrentProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import {
  POST_FORMAT_LABELS,
  maxRoundsForFormat,
  type Post,
  type PostMedia,
  type Comment,
  type Profile,
  type Client,
} from "@/types/database";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getCurrentProfile();

  const { data: post } = await supabase
    .from("posts")
    .select("*, clients ( max_revision_rounds, max_revision_rounds_by_format )")
    .eq("id", id)
    .single<
      Post & {
        clients: Pick<Client, "max_revision_rounds" | "max_revision_rounds_by_format"> | null;
      }
    >();

  if (!post) notFound();

  const { data: media } = await supabase
    .from("post_media")
    .select("*")
    .eq("post_id", id)
    .order("sort_order", { ascending: true })
    .returns<PostMedia[]>();

  const { data: rawComments } = await supabase
    .from("comments")
    .select("*, profiles ( full_name, role )")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .returns<(Comment & { profiles: Pick<Profile, "full_name" | "role"> | null })[]>();

  const mediaItems = await Promise.all(
    (media ?? []).map(async (m) => ({
      url: await presignGet(m.r2_key),
      type: m.type,
    }))
  );
  const validMedia = mediaItems.filter(
    (m): m is { url: string; type: "image" | "video" } => !!m.url
  );

  const comments = (rawComments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    author_id: c.author_id,
    author_name: c.profiles?.full_name ?? "Unbekannt",
    is_admin: c.profiles?.role === "admin",
    categories: c.categories,
    edited_at: c.edited_at,
  }));

  const canRespond =
    post.status === "zur_freigabe" ||
    post.status === "aenderung_gewuenscht" ||
    post.status === "zurueckgestellt";

  const maxRounds = post.clients ? maxRoundsForFormat(post.clients, post.format) : null;
  const roundsLimit = maxRounds === null ? null : maxRounds + post.revision_rounds_bonus;

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-orange-400">
            {POST_FORMAT_LABELS[post.format]}
          </span>
          <StatusBadge status={post.status} />
        </div>
        <h1 className="text-xl font-display font-semibold mb-2">{post.title}</h1>
        <div className="grid gap-2">
          <div className="flex items-center gap-3 flex-wrap">
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
            <p className="text-xs text-orange-300">
              Terminvorschlag &bdquo;{formatDateTime(post.proposed_publish_date)}&ldquo; wartet auf
              Bestätigung von NU STYL.
            </p>
          )}
          {post.proposed_publish_date_status === "abgelehnt" && (
            <p className="text-xs text-red-400">Dein letzter Terminvorschlag wurde abgelehnt.</p>
          )}
        </div>
      </div>

      <MediaViewer items={validMedia} format={post.format} />

      <div className="grid gap-3">
        <div className="flex gap-2 flex-wrap">
          {post.platforms.map((p) => (
            <span
              key={p}
              className="text-xs px-2 py-1 rounded-full bg-ink-800 border border-ink-700 text-ink-300"
            >
              {p}
            </span>
          ))}
        </div>
        {post.caption && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.caption}</p>
        )}
        {post.hashtags && (
          <p className="text-sm text-orange-400 break-words">{post.hashtags}</p>
        )}
      </div>

      {canRespond && (
        <div className="border-t border-ink-700 pt-6">
          <ApprovalActions
            postId={post.id}
            format={post.format}
            roundsUsed={post.revision_rounds_used}
            roundsLimit={roundsLimit}
            slides={validMedia.map((m) => m.type)}
          />
        </div>
      )}

      <div className="border-t border-ink-700 pt-6">
        <CommentThread
          postId={post.id}
          comments={comments}
          viewer={{
            id: session?.user.id ?? "",
            name: session?.profile.full_name ?? "Ich",
            isAdmin: session?.profile.role === "admin",
          }}
        />
      </div>
    </div>
  );
}
