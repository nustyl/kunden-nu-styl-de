import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  updateClientCompany,
  inviteClientUser,
  revokeClientUser,
  archiveClient,
  unarchiveClient,
  deleteClientHard,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { InvitePersonForm } from "@/components/admin/InvitePersonForm";
import { RoundsFormatField } from "@/components/admin/RoundsFormatField";
import { inputClass, labelClass, cardClass } from "@/lib/ui-classes";
import { formatDate } from "@/lib/format";
import { REVISION_ROUNDS_FORMAT_LABELS, type RevisionRoundsFormat } from "@/types/database";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  const { data: people } = await supabase
    .from("profiles")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: true });

  const admin = createAdminClient();
  const peopleWithEmail = await Promise.all(
    (people ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return { ...p, email: data.user?.email ?? "—" };
    })
  );

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("client_id", id)
    .order("publish_date", { ascending: false });

  const updateAction = updateClientCompany.bind(null, id);
  const inviteAction = inviteClientUser.bind(null, id);
  const revokeAction = revokeClientUser.bind(null, id);
  const archiveAction = archiveClient.bind(null, id);
  const unarchiveAction = unarchiveClient.bind(null, id);
  const deleteHardAction = deleteClientHard.bind(null, id);

  return (
    <div className="grid gap-8 max-w-3xl">
      <div>
        <Link href="/admin/kunden" className="text-sm text-ink-300 hover:text-paper">
          ← Alle Kunden
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <h1 className="text-2xl font-display font-semibold">{client.name}</h1>
          {client.archived_at && (
            <span className="rounded-full bg-red-500/15 text-red-400 text-xs font-semibold px-3 py-1">
              Archiviert seit {formatDate(client.archived_at)}
            </span>
          )}
        </div>
      </div>

      <section className={`${cardClass} grid gap-5`}>
        <h2 className="font-display font-semibold">Einstellungen</h2>
        <form action={updateAction} className="grid gap-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input id="name" name="name" defaultValue={client.name} required className={inputClass} />
            </div>
            <div>
              <label htmlFor="max_revision_rounds" className={labelClass}>
                Änderungsschleifen pro Beitrag (Standard)
              </label>
              <input
                id="max_revision_rounds"
                name="max_revision_rounds"
                type="number"
                min={0}
                defaultValue={client.max_revision_rounds ?? ""}
                placeholder="leer = unbegrenzt"
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-ink-700">
            <p className="text-sm font-medium mb-1">Änderungsschleifen pro Format</p>
            <p className="text-xs text-ink-400 mb-3">
              Überschreibt den Standardwert oben einzeln je Format. Leer lassen = Standard gilt.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {(Object.keys(REVISION_ROUNDS_FORMAT_LABELS) as RevisionRoundsFormat[]).map((key) => (
                <RoundsFormatField
                  key={key}
                  name={`rounds_${key}`}
                  label={REVISION_ROUNDS_FORMAT_LABELS[key]}
                  defaultValue={client.max_revision_rounds_by_format?.[key] ?? null}
                  defaultUnlimited={
                    !!client.max_revision_rounds_by_format &&
                    key in client.max_revision_rounds_by_format &&
                    client.max_revision_rounds_by_format[key] === null
                  }
                  placeholder={`Standard: ${client.max_revision_rounds ?? "∞"}`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" variant="ghost" className="justify-self-start">
            Speichern
          </Button>
        </form>
      </section>

      <section className={`${cardClass} grid gap-4`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-semibold">Personen</h2>
          <InvitePersonForm action={inviteAction} />
        </div>

        {peopleWithEmail.length > 0 ? (
          <ul className="grid gap-2">
            {peopleWithEmail.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-ink-800 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.full_name || "—"}</p>
                  <p className="text-sm text-ink-400 truncate">{p.email}</p>
                </div>
                <ConfirmForm
                  action={revokeAction.bind(null, p.id)}
                  confirmMessage={`${p.full_name || p.email} wirklich ausladen? Der Zugang wird sofort entzogen.`}
                  className="flex-none"
                >
                  <Button variant="danger" type="submit" className="min-h-[40px] px-4">
                    Ausladen
                  </Button>
                </ConfirmForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-300">Noch niemand eingeladen.</p>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold">Beiträge</h2>
          <Link href={`/admin/beitraege/neu?client_id=${id}`}>
            <Button variant="ghost">Beitrag anlegen</Button>
          </Link>
        </div>
        {!posts || posts.length === 0 ? (
          <p className="text-sm text-ink-300">Noch keine Beiträge für diesen Kunden.</p>
        ) : (
          <div className="grid gap-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/beitraege/${post.id}`}
                className="flex items-center justify-between gap-3 rounded-sm border border-ink-700 bg-ink-800 p-3 hover:border-ink-600"
              >
                <span className="truncate">{post.title}</span>
                <StatusBadge status={post.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={`${cardClass} grid gap-5 border-red-900`}>
        <h2 className="font-display font-semibold text-red-400">Gefahrenzone</h2>
        {client.archived_at ? (
          <div className="grid gap-3">
            <p className="text-sm text-ink-300">
              Zugang für alle Personen dieses Kunden ist gesperrt. Beiträge und Verlauf bleiben
              erhalten.
            </p>
            <form action={unarchiveAction}>
              <Button variant="ghost" type="submit">
                Entsperren
              </Button>
            </form>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-ink-300">
              Zugang sperren, Beiträge und Verlauf bleiben erhalten. Reversibel.
            </p>
            <form action={archiveAction}>
              <Button variant="ghost" type="submit">
                Archivieren
              </Button>
            </form>
          </div>
        )}

        <div className="grid gap-3 pt-3 border-t border-ink-700">
          <p className="text-sm text-ink-300">
            Kunde, alle Beiträge, Kommentare und Mediendateien unwiderruflich löschen (z. B. für
            Testläufe).
          </p>
          <ConfirmForm
            action={deleteHardAction}
            confirmMessage={`"${client.name}" wirklich endgültig löschen? Alle Beiträge, Kommentare und Mediendateien in R2 werden unwiderruflich entfernt. Das kann nicht rückgängig gemacht werden.`}
            className="justify-self-start"
          >
            <Button variant="danger" type="submit">
              Endgültig löschen
            </Button>
          </ConfirmForm>
        </div>
      </section>
    </div>
  );
}
