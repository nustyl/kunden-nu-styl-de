import { S3Client } from "@aws-sdk/client-s3";

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const ALLOWED_MIME_TYPES: Record<string, "image" | "video"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/heic": "image",
  "image/heif": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
};

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB pro Datei

export function keyFor(clientId: string, postId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = crypto.randomUUID();
  return `clients/${clientId}/posts/${postId}/${unique}-${safe}`;
}
