import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2/client";

// Liefert eine kurzlebige presigned GET-URL für ein Medium — aber nur,
// wenn der eingeloggte Nutzer laut RLS überhaupt Zugriff auf die
// zugehörige post_media-Zeile hat (Admin oder Kunde des Beitrags).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data: media } = await supabase
    .from("post_media")
    .select("id")
    .eq("r2_key", key)
    .single();

  if (!media) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 3600 }
  );

  return NextResponse.redirect(url);
}
