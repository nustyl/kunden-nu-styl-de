import type { MediaType } from "@/types/database";

const SINGLE_PUT_LIMIT = 20 * 1024 * 1024; // 20 MB
const PART_SIZE = 8 * 1024 * 1024; // 8 MB pro Multipart-Part

const MAX_IMAGE_EDGE = 2160;
const JPEG_QUALITY = 0.85;
const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Verkleinert große Bilder (max. 2160 px lange Kante, JPEG 85 %). Fällt still
// auf die Originaldatei zurück, wenn der Browser das Bild nicht verarbeiten
// kann oder das Ergebnis nicht kleiner wäre (z. B. HEIC, kleine JPEGs).
async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export interface UploadTarget {
  postId: string;
  clientId: string;
}

function putBlob(
  url: string,
  body: Blob,
  contentType: string | null,
  onLoaded: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onLoaded(e.loaded);
    };
    xhr.onload = () =>
      xhr.status < 300 ? resolve(xhr.getResponseHeader("ETag") ?? "") : reject(new Error("Upload fehlgeschlagen"));
    xhr.onerror = () => reject(new Error("Upload fehlgeschlagen"));
    xhr.send(body);
  });
}

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function uploadSingle(
  file: File,
  target: UploadTarget,
  onProgress: (percent: number) => void
) {
  const res = await postJson("/api/r2/presign-upload", {
    ...target,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Presign fehlgeschlagen");
  const { url, key, type } = await res.json();

  await putBlob(url, file, file.type, (loaded) => onProgress((loaded / file.size) * 100));
  return { key: key as string, type: type as MediaType };
}

async function uploadMultipart(
  file: File,
  target: UploadTarget,
  onProgress: (percent: number) => void
) {
  const createRes = await postJson("/api/r2/presign-multipart", {
    action: "create",
    ...target,
    filename: file.name,
    mimeType: file.type,
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

      const signRes = await postJson("/api/r2/presign-multipart", {
        action: "sign-part",
        key,
        uploadId,
        partNumber,
      });
      if (!signRes.ok) throw new Error("Presign (Part) fehlgeschlagen");
      const { url } = await signRes.json();

      const etag = await putBlob(url, chunk, null, (loaded) =>
        onProgress(((start + loaded) / file.size) * 100)
      );
      parts.push({ ETag: etag, PartNumber: partNumber });
    }

    const completeRes = await postJson("/api/r2/presign-multipart", {
      action: "complete",
      key,
      uploadId,
      parts,
    });
    if (!completeRes.ok) throw new Error("Zusammenführen fehlgeschlagen");
  } catch (err) {
    await postJson("/api/r2/presign-multipart", { action: "abort", key, uploadId }).catch(() => {});
    throw err;
  }

  return { key: key as string, type: type as MediaType };
}

export async function uploadFileToR2(
  original: File,
  target: UploadTarget,
  onProgress: (percent: number) => void
) {
  const file = await compressImage(original);
  const result =
    file.size > SINGLE_PUT_LIMIT
      ? await uploadMultipart(file, target, onProgress)
      : await uploadSingle(file, target, onProgress);
  return { ...result, size: file.size, mimeType: file.type };
}
