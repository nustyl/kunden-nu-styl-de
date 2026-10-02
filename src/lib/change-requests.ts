import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sectionRank, type ChangeRequest, type ChangeRound } from "@/types/database";

export interface ChangeItemView {
  id: string;
  section_key: string;
  section_label: string;
  category: string;
  body: string;
  is_supplement: boolean;
  author_id: string | null;
  author_name: string;
  created_at: string;
  edited_at: string | null;
  done_at: string | null;
}

export interface ChangeRoundView {
  id: string;
  round_no: number;
  created_at: string;
  resolved_version: number | null;
  resolved_at: string | null;
  items: ChangeItemView[];
}

// Alle Änderungsrunden eines Beitrags inkl. Punkte, neueste Runde zuerst.
// Runden und Punkte laufen über RLS (Kunde sieht nur eigene Beiträge);
// Autorennamen holen wir serverseitig, da Kunden fremde Profile nicht lesen
// dürfen.
export async function loadChangeRounds(postId: string): Promise<ChangeRoundView[]> {
  const supabase = await createClient();
  const [{ data: rounds }, { data: items }] = await Promise.all([
    supabase
      .from("change_rounds")
      .select("*")
      .eq("post_id", postId)
      .order("round_no", { ascending: false })
      .returns<ChangeRound[]>(),
    supabase.from("change_requests").select("*").eq("post_id", postId).returns<ChangeRequest[]>(),
  ]);

  const authorIds = [
    ...new Set((items ?? []).map((i) => i.author_id).filter((id): id is string => !!id)),
  ];
  const { data: authors } =
    authorIds.length > 0
      ? await createAdminClient().from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.full_name]));

  return (rounds ?? []).map((round) => ({
    id: round.id,
    round_no: round.round_no,
    created_at: round.created_at,
    resolved_version: round.resolved_version,
    resolved_at: round.resolved_at,
    items: (items ?? [])
      .filter((i) => i.round_id === round.id)
      .sort(
        (a, b) =>
          sectionRank(a.section_key) - sectionRank(b.section_key) || a.sort_order - b.sort_order
      )
      .map((i) => ({
        id: i.id,
        section_key: i.section_key,
        section_label: i.section_label,
        category: i.category,
        body: i.body,
        is_supplement: i.is_supplement,
        author_id: i.author_id,
        author_name: (i.author_id && nameById.get(i.author_id)) || "Ehemalige Person",
        created_at: i.created_at,
        edited_at: i.edited_at,
        done_at: i.done_at,
      })),
  }));
}
