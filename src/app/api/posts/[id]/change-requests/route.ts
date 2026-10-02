import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/email/resend";
import { cleanChangeItems, formatChangeItems } from "@/lib/change-items";

// Kunde ergänzt die laufende Änderungsrunde (z. B. etwas vergessen).
// Zählt nicht als neue Runde — das stellt add_change_supplement() sicher.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { items } = (await request.json()) as { items?: unknown };
  const changeItems = cleanChangeItems(items);
  if (changeItems.length === 0) {
    return NextResponse.json({ error: "Bitte trag mindestens eine Ergänzung ein" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { error } = await supabase.rpc("add_change_supplement", {
    p_post_id: id,
    p_items: changeItems,
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
    `Ergänzung zum Änderungswunsch: ${post?.title ?? ""}`,
    `${post?.clients?.name ?? "Ein Kunde"} hat die Änderungswünsche zu "${post?.title ?? id}" ergänzt:\n\n${formatChangeItems(changeItems)}\n\n${process.env.NEXT_PUBLIC_SITE_URL}/admin/beitraege/${id}`
  );

  return NextResponse.json({ ok: true });
}
