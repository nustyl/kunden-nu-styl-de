import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/email/resend";
import { POST_STATUS_LABELS, type PostStatus } from "@/types/database";

const CLIENT_STATUSES: PostStatus[] = ["freigegeben", "aenderung_gewuenscht", "zurueckgestellt"];

// Statusänderung durch den Kunden (Freigeben / Änderung gewünscht /
// Zurückstellen). Die eigentliche Berechtigungsprüfung inkl.
// Änderungsschleifen-Limit läuft in der Postgres-Funktion
// set_post_status() (security definer) — hier nur dünner Wrapper +
// Admin-Benachrichtigung.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, comment, categories } = (await request.json()) as {
    status: PostStatus;
    comment?: string;
    categories?: string[];
  };

  if (!CLIENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  }
  if (status === "aenderung_gewuenscht" && !comment?.trim()) {
    return NextResponse.json(
      { error: "Bitte beschreibe die gewünschte Änderung" },
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

  // Solange Änderungswünsche bearbeitet werden, sind Freigabe und weitere
  // Änderungsrunden gesperrt (Ergänzungen laufen über /api/comments).
  const { data: current } = await supabase.from("posts").select("status").eq("id", id).single();
  if (current?.status === "aenderung_gewuenscht") {
    return NextResponse.json(
      { error: "Deine Änderungswünsche werden gerade bearbeitet. Du kannst sie unten ergänzen." },
      { status: 409 }
    );
  }

  const { error } = await supabase.rpc("set_post_status", {
    p_post_id: id,
    p_status: status,
    p_comment: comment ?? null,
    p_categories: categories && categories.length > 0 ? categories : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("title, clients ( name )")
    .eq("id", id)
    .single<{ title: string; clients: { name: string } | null }>();

  const categoryLine =
    categories && categories.length > 0 ? `\nKategorien: ${categories.join(", ")}` : "";

  await notifyAdmin(
    `${POST_STATUS_LABELS[status]}: ${post?.title ?? ""}`,
    `${post?.clients?.name ?? "Ein Kunde"} hat den Beitrag "${post?.title ?? id}" als "${POST_STATUS_LABELS[status]}" markiert.${categoryLine}${
      comment ? `\n\nKommentar: ${comment}` : ""
    }`
  );

  return NextResponse.json({ ok: true });
}
