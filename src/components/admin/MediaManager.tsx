"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFileSize } from "@/lib/format";
import type { MediaType } from "@/types/database";

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

const SINGLE_PUT_LIMIT = 20 * 1024 * 1024; // 20 MB
const PART_SIZE = 8 * 1024 * 1024; // 8 MB pro Multipart-Part

export function MediaManager({
  postId,
  clientId,
  initialMedia,
}: {
  postId: string;
  clientId: string;
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

  async function uploadSingle(file: File, jobId: string) {
    const res = await fetch("/api/r2/presign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        clientId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Presign fehlgeschlagen");
    const { url, key, type } = await res.json();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) updateJob(jobId, { progress: (e.loaded / e.total) * 100 });
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload fehlgeschlagen")));
      xhr.onerror = () => reject(new Error("Upload fehlgeschlagen"));
      xhr.send(file);
    });

    return { key, type: type as MediaType };
  }

  async function uploadMultipart(file: File, jobId: string) {
    const createRes = await fetch("/api/r2/presign-multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        postId,
        clientId,
        filename: file.name,
        mimeType: file.type,
      }),
    });
    if (!createRes.ok) throw new Error((await createRes.json()).error ?? "Presign fehlgeschlagen");
    const { key, uploadId, type } = await createRes.json();

    const partCount = Math.ceil(file.size / PART_SIZE);
    const parts: { ETag: string; PartNumber: number }[] = [];

    try {
      for (let i = 0; i < partCount; i++) {
        const partNumber = i + 1;
        const start = i * PART_SIZE;
        const chunk = file.slice(start, start + PART_SIZE);

        const signRes = await fetch("/api/r2/presign-multipart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sign-part", key, uploadId, partNumber }),
        });
        if (!signRes.ok) throw new Error("Presign (Part) fehlgeschlagen");
        const { url } = await signRes.json();

        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", url);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const doneBytes = start + e.loaded;
              updateJob(jobId, { progress: (doneBytes / file.size) * 100 });
            }
          };
          xhr.onload = () => {
            if (xhr.status < 300) resolve(xhr.getResponseHeader("ETag") ?? "");
            else reject(new Error("Upload fehlgeschlagen"));
          };
          xhr.onerror = () => reject(new Error("Upload fehlgeschlagen"));
          xhr.send(chunk);
        });

        parts.push({ ETag: etag, PartNumber: partNumber });
      }

      const completeRes = await fetch("/api/r2/presign-multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", key, uploadId, parts }),
      });
      if (!completeRes.ok) throw new Error("Zusammenführen fehlgeschlagen");
    } catch (err) {
      await fetch("/api/r2/presign-multipart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abort", key, uploadId }),
      }).catch(() => {});
      throw err;
    }

    return { key, type: type as MediaType };
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      const jobId = crypto.randomUUID();
      setJobs((prev) => [...prev, { id: jobId, name: file.name, progress: 0 }]);

      try {
        const { key, type } =
          file.size > SINGLE_PUT_LIMIT
            ? await uploadMultipart(file, jobId)
            : await uploadSingle(file, jobId);

        const { data: inserted, error } = await supabase
          .from("post_media")
          .insert({
            post_id: postId,
            r2_key: key,
            type,
            mime_type: file.type,
            size: file.size,
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
              className="relative aspect-[9/16] rounded-sm overflow-hidden border border-ink-700 bg-ink-900 cursor-grab"
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
