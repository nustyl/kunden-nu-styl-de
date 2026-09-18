import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { inputClass, labelClass, cardClass } from "@/lib/ui-classes";
import { PLATFORMS } from "@/types/database";

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

      <form action={createPost} className={`${cardClass} grid gap-4`}>
        <div>
          <label htmlFor="client_id" className={labelClass}>
            Kunde
          </label>
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={client_id ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Kunde wählen…
            </option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className={labelClass}>
            Titel (intern)
          </label>
          <input id="title" name="title" required className={inputClass} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="format" className={labelClass}>
              Format
            </label>
            <select id="format" name="format" defaultValue="beitrag" className={inputClass}>
              <option value="reel">Reel</option>
              <option value="beitrag">Beitrag</option>
              <option value="karussell">Karussell</option>
              <option value="story">Story</option>
            </select>
          </div>
          <div>
            <span className={labelClass}>Plattformen</span>
            <div className="flex flex-wrap gap-3 pt-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="platforms" value={p} className="accent-orange-600" />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="caption" className={labelClass}>
            Caption
          </label>
          <textarea id="caption" name="caption" rows={4} className={`${inputClass} h-auto py-3`} />
        </div>

        <div>
          <label htmlFor="hashtags" className={labelClass}>
            Hashtags
          </label>
          <input id="hashtags" name="hashtags" className={inputClass} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="publish_date" className={labelClass}>
              Posting-Datum &amp; -Zeit
            </label>
            <input
              type="datetime-local"
              id="publish_date"
              name="publish_date"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="approval_deadline" className={labelClass}>
              Freigabe bis
            </label>
            <input
              type="date"
              id="approval_deadline"
              name="approval_deadline"
              className={inputClass}
            />
          </div>
        </div>

        <Button type="submit" variant="primary" className="justify-self-start">
          Anlegen & Medien hochladen
        </Button>
      </form>
    </div>
  );
}
