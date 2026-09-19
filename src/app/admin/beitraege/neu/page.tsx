import { createClient } from "@/lib/supabase/server";
import { NewPostForm } from "@/components/admin/NewPostForm";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  return (
    <div className="max-w-2xl grid gap-6">
      <h1 className="text-2xl font-display font-semibold">Neuer Beitrag</h1>
      <NewPostForm clients={clients ?? []} defaultClientId={client_id ?? ""} />
    </div>
  );
}
