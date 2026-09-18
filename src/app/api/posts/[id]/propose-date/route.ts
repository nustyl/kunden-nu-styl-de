import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/email/resend";
import { formatDateTime } from "@/lib/format";

// Kunde schlägt eine neue Posting-Zeit vor. Muss vom Admin bestätigt werden
// (siehe acceptDateProposal / rejectDateProposal in lib/actions/admin.ts).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { date } = (await request.json()) as { date?: string };

  if (!date) {
    return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { error } = await supabase.rpc("propose_publish_date", {
    p_post_id: id,
    p_date: date,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("title, clients ( name )")
    .eq("id", id)
    .single<{ title: string; clients: { name: string } | null }>();

  await notifyAdmin(
    `Neuer Terminvorschlag: ${post?.title ?? ""}`,
    `${post?.clients?.name ?? "Ein Kunde"} schlägt für "${post?.title ?? id}" einen neuen Posting-Termin vor: ${formatDateTime(
      date
    )}`
  );

  return NextResponse.json({ ok: true });
}
