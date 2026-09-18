import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { cardClass } from "@/lib/ui-classes";

export default async function AdminClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*, posts ( count )")
    .order("name", { ascending: true });

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-semibold">Kunden</h1>
        <Link href="/admin/kunden/neu">
          <Button variant="primary">Kunde anlegen</Button>
        </Link>
      </div>

      {!clients || clients.length === 0 ? (
        <div className={cardClass}>
          <p className="text-ink-300">Noch keine Kunden angelegt.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/admin/kunden/${c.id}`}
              className={`${cardClass} hover:border-ink-600 transition-colors`}
            >
              <p className="font-display font-semibold mb-1">{c.name}</p>
              <p className="text-sm text-ink-300">
                {c.posts?.[0]?.count ?? 0} Beiträge
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
