import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { presignGet } from "@/lib/r2/presign";
import {
  updatePost,
  deletePost,
  reuploadNewVersion,
  grantRevisionException,
  acceptDateProposal,
  rejectDateProposal,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { MediaManager } from "@/components/admin/MediaManager";
import { CommentThread } from "@/components/portal/CommentThread";
import { getCurrentProfile } from "@/lib/auth";
import { GermanDateTimeField } from "@/components/ui/GermanDateTimeField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { inputClass, labelClass, cardClass } from "@/lib/ui-classes";
import { toDateTimeLocalValue, formatDateTime } from "@/lib/format";
import {
  PLATFORMS,
  maxRoundsForFormat,
  type Comment,
  type PostMedia,
  type Profile,
} from "@/types/database";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getCurrentProfile();

  const { data: post } = await supabase
    .from("posts")
    .select("*, clients ( id, name, max_revision_rounds, max_revision_rounds_by_format )")
    .eq("id", id)
    .single();

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

  const mediaWithUrls = await Promise.all(
    (media ?? [])
      .filter((m) => !m.r2_key.startsWith("deleted/"))
      .map(async (m) => ({
      id: m.id,
      r2_key: m.r2_key,
      type: m.type,
      sort_order: m.sort_order,
      size: m.size,
      url: await presignGet(m.r2_key),
    }))
  );

  // Letzter Änderungswunsch eines Kunden -> betroffene Slides markieren
  const latestRequest = [...comments]
    .reverse()
    .find((c) => !c.is_admin && c.categories && c.categories.length > 0);
  const requestCategories = latestRequest?.categories ?? [];
  const flaggedSlides = new Set<number>();
  for (const cat of requestCategories) {
    const m = cat.match(/^Slide (\d+) ·/);
    if (m) flaggedSlides.add(Number(m[1]));
  }
  if (
    requestCategories.length > 0 &&
    !requestCategories.some((cat) => cat.startsWith("Slide ") || cat.startsWith("Allgemein ·"))
  ) {
    flaggedSlides.add(1);
  }

  const updateAction = updatePost.bind(null, id);
  const deleteAction = deletePost.bind(null, id);
  const reuploadAction = reuploadNewVersion.bind(null, id);
  const grantExceptionAction = grantRevisionException.bind(null, id);
  const acceptDateAction = acceptDateProposal.bind(null, id);
  const rejectDateAction = rejectDateProposal.bind(null, id);
  const client = (
    post as unknown as {
      clients: {
        id: string;
        name: string;
        max_revision_rounds: number | null;
        max_revision_rounds_by_format: Partial<Record<"reel" | "beitrag" | "story", number | null>>;
      };
    }
  ).clients;

  const maxRounds = maxRoundsForFormat(client, post.format);
  const effectiveLimit = maxRounds === null ? null : maxRounds + post.revision_rounds_bonus;

  return (
    <div className="max-w-2xl grid gap-8">
      <div>
        <Link
          href={`/admin/kunden/${client.id}`}
          className="text-sm text-ink-300 hover:text-paper"
        >
          ← {client.name}
        </Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <h1 className="text-2xl font-display font-semibold">{post.title}</h1>
          <span className="text-sm text-ink-400">Version {post.version}</span>
        </div>
      </div>

      <section className={`${cardClass} grid gap-3`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display font-semibold">Änderungsschleifen</h2>
            <p className="text-sm text-ink-300">
              {post.revision_rounds_used} von {effectiveLimit === null ? "∞" : effectiveLimit}{" "}
              genutzt
              {maxRounds !== null && post.revision_rounds_bonus > 0 && (
                <span className="text-ink-500"> (inkl. {post.revision_rounds_bonus} Bonus)</span>
              )}
            </p>
          </div>
          {effectiveLimit !== null && post.revision_rounds_used >= effectiveLimit && (
            <form action={grantExceptionAction}>
              <Button variant="ghost" type="submit">
                Zusatz-Runde gewähren
              </Button>
            </form>
          )}
        </div>
      </section>

      {post.proposed_publish_date_status === "offen" && (
        <section className="rounded-md border border-orange-600 bg-orange-950/20 p-4 grid gap-3">
          <h2 className="font-display font-semibold">Terminvorschlag vom Kunden</h2>
          <p className="text-sm">
            Neuer Wunschtermin: <strong>{formatDateTime(post.proposed_publish_date)}</strong>
          </p>
          <div className="flex gap-2">
            <form action={acceptDateAction}>
              <Button variant="primary" type="submit">
                Übernehmen
              </Button>
            </form>
            <form action={rejectDateAction}>
              <Button variant="ghost" type="submit">
                Ablehnen
              </Button>
            </form>
          </div>
        </section>
      )}

      {post.status === "aenderung_gewuenscht" && (
        <section className="rounded-md border border-orange-600 bg-orange-950/20 p-4 grid gap-3">
          <div>
            <h2 className="font-display font-semibold">Änderungswünsche vom Kunden</h2>
            <p className="text-xs text-ink-400">
              Setze sie unten um: pro Slide auf &bdquo;Ersetzen&ldquo; klicken (Position bleibt),
              Dateien löschen oder neue hochladen. Danach die Überarbeitung senden.
            </p>
          </div>
          {latestRequest ? (
            <div className="rounded-sm border border-ink-700 bg-ink-900 p-3 grid gap-2">
              <div className="flex flex-wrap gap-1.5">
                {requestCategories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-orange-500/15 text-orange-300 text-xs px-2 py-0.5"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{latestRequest.body}</p>
              <p className="text-xs text-ink-500">
                {latestRequest.author_name} · {formatDateTime(latestRequest.created_at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-300">Kein Änderungswunsch-Text gefunden.</p>
          )}
          <ConfirmForm
            action={reuploadAction}
            confirmMessage={`Überarbeitung als Version ${post.version + 1} zur Freigabe senden? Alle Personen von ${client.name} werden per E-Mail informiert.`}
            className="justify-self-start"
          >
            <Button variant="primary" type="submit">
              Überarbeitung zur Freigabe senden
            </Button>
          </ConfirmForm>
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="font-display font-semibold">Medien</h2>
        <MediaManager
          postId={post.id}
          clientId={client.id}
          format={post.format}
          status={post.status}
          flaggedSlides={post.status === "aenderung_gewuenscht" ? [...flaggedSlides] : []}
          initialMedia={mediaWithUrls}
        />
      </section>

      <section className={`${cardClass}`}>
        <CommentThread
          postId={post.id}
          comments={comments}
          viewer={{ id: session?.user.id ?? "", name: "Luc Picard", isAdmin: true }}
        />
      </section>

      <form action={updateAction} className={`${cardClass} grid gap-4`}>
        <h2 className="font-display font-semibold">Details</h2>

        <div>
          <label htmlFor="title" className={labelClass}>
            Titel (intern)
          </label>
          <input id="title" name="title" defaultValue={post.title} required className={inputClass} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="format" className={labelClass}>
              Format
            </label>
            <select id="format" name="format" defaultValue={post.format} className={inputClass}>
              <option value="reel">Reel</option>
              <option value="beitrag">Beitrag</option>
              <option value="karussell">Karussell</option>
              <option value="story">Story</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select id="status" name="status" defaultValue={post.status} className={inputClass}>
              <option value="entwurf">Entwurf</option>
              <option value="zur_freigabe">Zur Freigabe</option>
              <option value="freigegeben">Freigegeben</option>
              <option value="aenderung_gewuenscht">Änderung gewünscht</option>
              <option value="zurueckgestellt">Zurückgestellt</option>
              <option value="veroeffentlicht">Veröffentlicht</option>
            </select>
          </div>
        </div>

        <div>
          <span className={labelClass}>Plattformen</span>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="platforms"
                  value={p}
                  defaultChecked={post.platforms.includes(p)}
                  className="accent-orange-600"
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="caption" className={labelClass}>
            Caption
          </label>
          <textarea
            id="caption"
            name="caption"
            rows={4}
            defaultValue={post.caption}
            className={`${inputClass} h-auto py-3`}
          />
        </div>

        <div>
          <label htmlFor="hashtags" className={labelClass}>
            Hashtags
          </label>
          <input id="hashtags" name="hashtags" defaultValue={post.hashtags} className={inputClass} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="publish_date" className={labelClass}>
              Posting-Datum &amp; -Zeit
            </label>
            <GermanDateTimeField
              id="publish_date"
              name="publish_date"
              defaultValue={toDateTimeLocalValue(post.publish_date)}
            />
          </div>
          <div>
            <label htmlFor="approval_deadline" className={labelClass}>
              Freigabe bis
            </label>
            <GermanDateTimeField
              id="approval_deadline"
              name="approval_deadline"
              defaultValue={post.approval_deadline ?? ""}
              withTime={false}
            />
          </div>
        </div>

        <SubmitButton pendingLabel="Wird gespeichert…" className="justify-self-start">
          Speichern
        </SubmitButton>
      </form>

      <ConfirmForm
        action={deleteAction}
        confirmMessage={`"${post.title}" wirklich löschen? Beitrag, Medien und Kommentarverlauf werden unwiderruflich entfernt.`}
        className="justify-self-start"
      >
        <Button variant="danger" type="submit">
          Beitrag löschen
        </Button>
      </ConfirmForm>
    </div>
  );
}
