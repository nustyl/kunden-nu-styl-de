import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/email/resend";
import { cleanChangeItems, formatChangeItems } from "@/lib/change-items";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/database";

const CLIENT_STATUSES: PostStatus[] = ["freigegeben", "aenderung_gewuenscht", "zurueckgestellt"];

// Statusänderung durch den Kunden (Freigeben / Änderung gewünscht /
// Zurückstellen). Berechtigung, Sperre während laufender Änderungen und das
// Änderungsschleifen-Limit prüft die Postgres-Funktion
// submit_post_response() (security definer) — hier nur dünner Wrapper +
// Admin-Benachrichtigung.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, items } = (await request.json()) as { status: PostStatus; items?: unknown };

  if (!CLIENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  }
  const changeItems = status === "aenderung_gewuenscht" ? cleanChangeItems(items) : [];
  if (status === "aenderung_gewuenscht" && changeItems.length === 0) {
    return NextResponse.json(
      { error: "Bitte beschreibe mindestens eine gewünschte Änderung" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { error } = await supabase.rpc("submit_post_response", {
    p_post_id: id,
    p_status: status,
    p_items: changeItems.length > 0 ? changeItems : null,
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
    `${POST_STATUS_LABELS[status]}: ${post?.title ?? ""}`,
    `${post?.clients?.name ?? "Ein Kunde"} hat den Beitrag "${post?.title ?? id}" als "${POST_STATUS_LABELS[status]}" markiert.${
      changeItems.length > 0 ? `\n\n${formatChangeItems(changeItems)}` : ""
    }\n\n${process.env.NEXT_PUBLIC_SITE_URL}/admin/beitraege/${id}`
  );

  return NextResponse.json({ ok: true });
}
