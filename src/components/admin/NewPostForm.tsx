"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { uploadFileToR2 } from "@/lib/r2/upload-client";
import { formatFileSize } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, cardClass } from "@/lib/ui-classes";
import { PLATFORMS, mediaAspectClass, type PostFormat } from "@/types/database";

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string | null;
  progress: number;
  error?: string;
}

export function NewPostForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<PostFormat>("beitrag");
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList) {
    const added = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...added]);
  }

  function removeFile(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }

  function patchFile(id: string, patch: Partial<QueuedFile>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    let created: { id: string; clientId: string };
    try {
      created = await createPost(new FormData(e.currentTarget));
    } catch {
      setError("Beitrag konnte nicht angelegt werden. Bitte Angaben prüfen und erneut versuchen.");
      setSubmitting(false);
      return;
    }
    setCreatedId(created.id);

    let failed = 0;
    for (const [index, item] of queue.entries()) {
      try {
        const { key, type, size, mimeType } = await uploadFileToR2(
          item.file,
          { postId: created.id, clientId: created.clientId },
          (progress) => patchFile(item.id, { progress })
        );
        const { error: insertError } = await supabase.from("post_media").insert({
          post_id: created.id,
          r2_key: key,
          type,
          mime_type: mimeType,
          size,
          sort_order: index,
        });
        if (insertError) throw new Error(insertError.message);
        patchFile(item.id, { progress: 100 });
      } catch (err) {
        failed++;
        patchFile(item.id, { error: err instanceof Error ? err.message : "Fehler" });
      }
    }

    if (failed === 0) {
      router.push(`/admin/beitraege/${created.id}`);
    } else {
      setError(
        `Der Beitrag wurde angelegt, aber ${failed} Datei(en) konnten nicht hochgeladen werden. Du kannst sie auf der Beitragsseite erneut hochladen.`
      );
      setSubmitting(false);
    }
  }

  const aspect = mediaAspectClass(format);
  const locked = submitting || createdId !== null;

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} grid gap-4`}>
      <div>
        <label htmlFor="client_id" className={labelClass}>
          Kunde
        </label>
        <select
          id="client_id"
          name="client_id"
          required
          defaultValue={defaultClientId}
          className={inputClass}
        >
          <option value="" disabled>
            Kunde wählen…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="title" className={labelClass}>
          Titel (intern)
        </label>
        <input id="title" name="title" required className={inputClass} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="format" className={labelClass}>
            Format
          </label>
          <select
            id="format"
            name="format"
            value={format}
            onChange={(e) => setFormat(e.target.value as PostFormat)}
            className={inputClass}
          >
            <option value="reel">Reel (9:16)</option>
            <option value="beitrag">Beitrag (3:4)</option>
            <option value="karussell">Karussell (3:4)</option>
            <option value="story">Story (9:16)</option>
          </select>
        </div>
        <div>
          <span className={labelClass}>Plattformen</span>
          <div className="flex flex-wrap gap-3 pt-2">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="platforms" value={p} className="accent-orange-600" />
                {p}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className={labelClass}>Medien</span>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-md border-2 border-dashed border-ink-600 hover:border-orange-500 transition-colors p-6 text-center text-sm text-ink-300"
        >
          Dateien hierher ziehen oder klicken (jpg, png, webp, heic, mp4, mov)
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,image/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {queue.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
            {queue.map((item, i) => (
              <div
                key={item.id}
                className={`relative ${aspect} rounded-sm overflow-hidden border border-ink-700 bg-ink-900`}
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-400 text-xs px-2 text-center break-all">
                    {item.file.name}
                  </div>
                )}
                {!locked && (
                  <button
                    type="button"
                    onClick={() => removeFile(item.id)}
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/70 text-white text-sm flex items-center justify-center"
                    aria-label="Entfernen"
                  >
                    ×
                  </button>
                )}
                <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white rounded-full px-2 py-0.5">
                  {i + 1}
                </span>
                <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white rounded-full px-2 py-0.5">
                  {item.error
                    ? "Fehler"
                    : submitting
                      ? `${Math.round(item.progress)}%`
                      : formatFileSize(item.file.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="caption" className={labelClass}>
          Caption
        </label>
        <textarea id="caption" name="caption" rows={4} className={`${inputClass} h-auto py-3`} />
      </div>

      <div>
        <label htmlFor="hashtags" className={labelClass}>
          Hashtags
        </label>
        <input id="hashtags" name="hashtags" className={inputClass} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="publish_date" className={labelClass}>
            Posting-Datum &amp; -Zeit
          </label>
          <input type="datetime-local" id="publish_date" name="publish_date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="approval_deadline" className={labelClass}>
            Freigabe bis
          </label>
          <input type="date" id="approval_deadline" name="approval_deadline" className={inputClass} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        {createdId ? (
          <Link href={`/admin/beitraege/${createdId}`}>
            <Button type="button" variant="primary">
              Zum Beitrag
            </Button>
          </Link>
        ) : (
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting
              ? queue.length > 0
                ? "Wird angelegt & hochgeladen…"
                : "Wird angelegt…"
              : queue.length > 0
                ? "Anlegen & Medien hochladen"
                : "Anlegen"}
          </Button>
        )}
      </div>
    </form>
  );
}
