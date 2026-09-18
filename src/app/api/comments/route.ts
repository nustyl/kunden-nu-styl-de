import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/email/resend";

export async function POST(request: Request) {
  const { postId, body } = await request.json();
  if (!postId || !body?.trim()) {
    return NextResponse.json({ error: "Fehlende Angaben" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, body: body.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (profile?.role === "client") {
    const { data: post } = await supabase
      .from("posts")
      .select("title")
      .eq("id", postId)
      .single();

    await notifyAdmin(
      `Neuer Kommentar: ${post?.title ?? ""}`,
      `${profile.full_name ?? "Ein Kunde"} hat zu "${post?.title ?? postId}" kommentiert:\n\n${body}`
    );
  }

  return NextResponse.json({ comment });
}
