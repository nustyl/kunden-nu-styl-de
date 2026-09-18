import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireAdmin, AuthError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { r2, R2_BUCKET } from "@/lib/r2/client";

// Löscht ein Medium aus R2 (Speicher sparen), behält aber die
// post_media-Zeile inkl. Metadaten für den Verlauf -> r2_key wird
// geleert, damit klar ist: Datei ist weg.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { mediaId } = await request.json();
    if (!mediaId) {
      return NextResponse.json({ error: "mediaId fehlt" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: media, error } = await admin
      .from("post_media")
      .select("id, r2_key")
      .eq("id", mediaId)
      .single();

    if (error || !media) {
      return NextResponse.json({ error: "Medium nicht gefunden" }, { status: 404 });
    }

    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: media.r2_key }));

    await admin
      .from("post_media")
      .update({ r2_key: `deleted/${media.id}` })
      .eq("id", mediaId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
