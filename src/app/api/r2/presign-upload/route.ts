import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin, AuthError } from "@/lib/auth";
import { r2, R2_BUCKET, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, keyFor } from "@/lib/r2/client";

// Presigned PUT-URL für Einzeldatei-Uploads (Bilder, kleine Videos).
// Für große Videos siehe /api/r2/presign-multipart.
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const { postId, clientId, filename, mimeType, size } = await request.json();

    if (!postId || !clientId || !filename || !mimeType) {
      return NextResponse.json({ error: "Fehlende Angaben" }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES[mimeType]) {
      return NextResponse.json({ error: "Dateityp nicht erlaubt" }, { status: 400 });
    }
    if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Datei zu groß" }, { status: 400 });
    }

    const key = keyFor(clientId, postId, filename);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(r2, command, { expiresIn: 900 });

    return NextResponse.json({
      url,
      key,
      type: ALLOWED_MIME_TYPES[mimeType],
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
