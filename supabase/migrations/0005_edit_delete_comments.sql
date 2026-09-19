-- =========================================================================
-- Kommentare bearbeiten & löschen
-- Admin: alle Kommentare. Kunde: nur eigene. Läuft über SECURITY-DEFINER-
-- Funktionen, damit Kunden nur den Text (body) ändern können und kein
-- direktes UPDATE/DELETE auf comments brauchen.
-- =========================================================================

alter table public.comments
  add column edited_at timestamptz;

comment on column public.comments.edited_at is
  'Zeitpunkt der letzten Bearbeitung des Kommentartexts. NULL = nie bearbeitet.';

create function public.edit_comment(
  p_comment_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if coalesce(trim(p_body), '') = '' then
    raise exception 'Kommentar darf nicht leer sein';
  end if;

  select author_id into v_author from public.comments where id = p_comment_id;
  if not found then
    raise exception 'Kommentar nicht gefunden';
  end if;

  if not (public.is_admin() or v_author = auth.uid()) then
    raise exception 'Keine Berechtigung für diesen Kommentar';
  end if;

  update public.comments
  set body = trim(p_body),
      edited_at = now()
  where id = p_comment_id;
end;
$$;

create function public.delete_comment(
  p_comment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.comments where id = p_comment_id;
  if not found then
    raise exception 'Kommentar nicht gefunden';
  end if;

  if not (public.is_admin() or v_author = auth.uid()) then
    raise exception 'Keine Berechtigung für diesen Kommentar';
  end if;

  delete from public.comments where id = p_comment_id;
end;
$$;

grant execute on function public.edit_comment(uuid, text) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
