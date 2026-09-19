"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFileSize } from "@/lib/format";
import { uploadFileToR2 } from "@/lib/r2/upload-client";
import { mediaAspectClass, type MediaType, type PostFormat } from "@/types/database";

interface MediaItem {
  id: string;
  r2_key: string;
  type: MediaType;
  sort_order: number;
  url: string | null;
  size: number | null;
}

interface UploadJob {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export function MediaManager({
  postId,
  clientId,
  format,
  initialMedia,
}: {
  postId: string;
  clientId: string;
  format: PostFormat;
  initialMedia: MediaItem[];
}) {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>(
    [...initialMedia].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function updateJob(id: string, patch: Partial<UploadJob>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      const jobId = crypto.randomUUID();
      setJobs((prev) => [...prev, { id: jobId, name: file.name, progress: 0 }]);

      try {
        const { key, type, size, mimeType } = await uploadFileToR2(file, { postId, clientId }, (progress) =>
          updateJob(jobId, { progress })
        );

        const { data: inserted, error } = await supabase
          .from("post_media")
          .insert({
            post_id: postId,
            r2_key: key,
            type,
            mime_type: mimeType,
            size,
            sort_order: media.length,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        setMedia((prev) => [...prev, { ...inserted, url: null }]);
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        router.refresh();
      } catch (err) {
        updateJob(jobId, { error: err instanceof Error ? err.message : "Fehler" });
      }
    }
  }

  async function persistOrder(next: MediaItem[]) {
    setMedia(next);
    await Promise.all(
      next.map((m, i) =>
        m.sort_order === i
          ? null
          : supabase.from("post_media").update({ sort_order: i }).eq("id", m.id)
      )
    );
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...media];
    const [moved] = next.splice(dragIndex, 1);
    if (!moved) return;
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    persistOrder(next.map((m, i) => ({ ...m, sort_order: i })));
  }

  async function deleteMedia(id: string) {
    if (!confirm("Dieses Medium wirklich löschen? Die Datei wird aus dem Speicher entfernt.")) return;
    const res = await fetch("/api/r2/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId: id }),
    });
    if (res.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-md border-2 border-dashed border-ink-600 hover:border-orange-500 transition-colors p-8 text-center text-sm text-ink-300"
      >
        Dateien hierher ziehen oder klicken (jpg, png, webp, heic, mp4, mov)
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,image/*,video/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {jobs.length > 0 && (
        <div className="grid gap-2">
          {jobs.map((job) => (
            <div key={job.id} className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="truncate">{job.name}</span>
                <span className="text-ink-400">
                  {job.error ? "Fehler" : `${Math.round(job.progress)}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                <div
                  className={`h-full ${job.error ? "bg-red-500" : "bg-orange-500"}`}
                  style={{ width: `${job.error ? 100 : job.progress}%` }}
                />
              </div>
              {job.error && <p className="text-red-400 text-xs mt-1">{job.error}</p>}
            </div>
          ))}
        </div>
      )}

      {media.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {media.map((m, i) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className={`relative ${mediaAspectClass(format)} rounded-sm overflow-hidden border border-ink-700 bg-ink-900 cursor-grab`}
            >
              {m.url ? (
                m.type === "video" ? (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-500 text-xs">
                  {m.type === "video" ? "Video" : "Bild"}
                </div>
              )}
              <button
                onClick={() => deleteMedia(m.id)}
                className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/70 text-white text-sm flex items-center justify-center"
                aria-label="Löschen"
              >
                ×
              </button>
              <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white rounded-full px-2 py-0.5">
                {i + 1}
              </span>
              <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white rounded-full px-2 py-0.5">
                {formatFileSize(m.size)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
