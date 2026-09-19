import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { r2, R2_BUCKET, ALLOWED_MIME_TYPES } from "@/lib/r2/client";

// Ersetzt die Datei eines bestehenden Mediums an derselben Stelle (Slide-
// Nummer / Reihenfolge bleibt). Die neue Datei wurde bereits per presigned
// URL hochgeladen; hier wird nur die Zeile umgehängt und die alte Datei
// aus R2 entfernt (Speicher sparen).
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { mediaId, key, mimeType, size } = await request.json();

    if (!mediaId || typeof key !== "string" || !ALLOWED_MIME_TYPES[mimeType]) {
      return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: media } = await admin
      .from("post_media")
      .select("id, post_id, r2_key")
      .eq("id", mediaId)
      .single();
    if (!media) {
      return NextResponse.json({ error: "Medium nicht gefunden" }, { status: 404 });
    }

    const { data: post } = await admin
      .from("posts")
      .select("client_id")
      .eq("id", media.post_id)
      .single();
    if (!post) {
      return NextResponse.json({ error: "Beitrag nicht gefunden" }, { status: 404 });
    }

    // Der neue Schlüssel muss zu genau diesem Beitrag gehören.
    if (!key.startsWith(`clients/${post.client_id}/posts/${media.post_id}/`)) {
      return NextResponse.json({ error: "Ungültiger Dateipfad" }, { status: 400 });
    }

    const { error } = await admin
      .from("post_media")
      .update({
        r2_key: key,
        type: ALLOWED_MIME_TYPES[mimeType],
        mime_type: mimeType,
        size: typeof size === "number" ? size : null,
      })
      .eq("id", mediaId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (media.r2_key && !media.r2_key.startsWith("deleted/") && media.r2_key !== key) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: media.r2_key }));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
