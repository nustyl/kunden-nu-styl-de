import { NextResponse } from "next/server";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin, AuthError } from "@/lib/auth";
import { r2, R2_BUCKET, ALLOWED_MIME_TYPES, keyFor } from "@/lib/r2/client";

// Multipart-Upload für große Videos. Ablauf vom Client:
// 1) action "create"   -> { key, uploadId }
// 2) action "sign-part" (pro Part) -> presigned URL, Client lädt Chunk per PUT hoch
// 3) action "complete"  -> { parts: [{ ETag, PartNumber }] } fügt alles zusammen
// 4) action "abort"     -> bei Fehler/Abbruch aufräumen
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { postId, clientId, filename, mimeType } = body;
      if (!postId || !clientId || !filename || !ALLOWED_MIME_TYPES[mimeType]) {
        return NextResponse.json({ error: "Fehlende oder ungültige Angaben" }, { status: 400 });
      }
      const key = keyFor(clientId, postId, filename);
      const result = await r2.send(
        new CreateMultipartUploadCommand({
          Bucket: R2_BUCKET,
          Key: key,
          ContentType: mimeType,
        })
      );
      return NextResponse.json({
        key,
        uploadId: result.UploadId,
        type: ALLOWED_MIME_TYPES[mimeType],
      });
    }

    if (action === "sign-part") {
      const { key, uploadId, partNumber } = body;
      if (!key || !uploadId || !partNumber) {
        return NextResponse.json({ error: "Fehlende Angaben" }, { status: 400 });
      }
      const url = await getSignedUrl(
        r2,
        new UploadPartCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 900 }
      );
      return NextResponse.json({ url });
    }

    if (action === "complete") {
      const { key, uploadId, parts } = body;
      if (!key || !uploadId || !Array.isArray(parts)) {
        return NextResponse.json({ error: "Fehlende Angaben" }, { status: 400 });
      }
      await r2.send(
        new CompleteMultipartUploadCommand({
          Bucket: R2_BUCKET,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        })
      );
      return NextResponse.json({ key });
    }

    if (action === "abort") {
      const { key, uploadId } = body;
      if (!key || !uploadId) {
        return NextResponse.json({ error: "Fehlende Angaben" }, { status: 400 });
      }
      await r2.send(
        new AbortMultipartUploadCommand({ Bucket: R2_BUCKET, Key: key, UploadId: uploadId })
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
