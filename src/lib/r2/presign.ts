import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "./client";

// Server-only: presigned GET-URLs für Server Components (Listen-/Detailseiten).
// Läuft nach expiresIn ab -> nicht cachen, pro Request neu erzeugen.
export async function presignGet(key: string, expiresIn = 3600): Promise<string | null> {
  if (!key || key.startsWith("deleted/")) return null;
  try {
    return await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), {
      expiresIn,
    });
  } catch (err) {
    console.error("Presign-Fehler:", err);
    return null;
  }
}
