-- =========================================================================
-- Änderungsschleifen individuell pro Format
-- (Reel / Beitrag & Karussell / Story). "max_revision_rounds" bleibt der
-- Standardwert, der gilt, solange für ein Format kein eigener Wert gesetzt
-- ist.
-- =========================================================================

alter table public.clients
  add column max_revision_rounds_by_format jsonb not null default '{}'::jsonb;

comment on column public.clients.max_revision_rounds_by_format is
  'Optionale Overrides pro Format, z.B. {"reel": 3, "beitrag": 1, "story": 0}. '
  'Fehlt ein Format als Key, gilt max_revision_rounds. "karussell"-Beiträge '
  'verwenden immer den Wert von "beitrag".';

-- ---------------------------------------------------------------------
-- set_post_status neu: Limit wird jetzt formatabhängig ermittelt.
-- ---------------------------------------------------------------------
drop function if exists public.set_post_status(uuid, public.post_status, text, text[]);

create function public.set_post_status(
  p_post_id uuid,
  p_status public.post_status,
  p_comment text default null,
  p_categories text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_post record;
  v_default_rounds integer;
  v_overrides jsonb;
  v_format_key text;
  v_max_rounds integer;
  v_effective_limit integer;
  v_uid uuid := auth.uid();
begin
  if p_status not in ('freigegeben', 'aenderung_gewuenscht', 'zurueckgestellt') then
    raise exception 'Ungültiger Status für Kunden-Freigabe';
  end if;

  select client_id into v_client_id from public.profiles where id = v_uid;

  select * into v_post from public.posts where id = p_post_id;

  if v_client_id is null or v_post.id is null or v_client_id <> v_post.client_id then
    raise exception 'Kein Zugriff auf diesen Beitrag';
  end if;

  select max_revision_rounds, max_revision_rounds_by_format
  into v_default_rounds, v_overrides
  from public.clients where id = v_client_id;

  v_format_key := case when v_post.format = 'karussell' then 'beitrag' else v_post.format::text end;

  if v_overrides ? v_format_key then
    v_max_rounds := (v_overrides ->> v_format_key)::integer;
  else
    v_max_rounds := v_default_rounds;
  end if;

  v_effective_limit := case
    when v_max_rounds is null then null
    else v_max_rounds + v_post.revision_rounds_bonus
  end;

  if p_status = 'aenderung_gewuenscht' then
    if coalesce(trim(p_comment), '') = '' then
      raise exception 'Kommentar ist bei Änderungswunsch erforderlich';
    end if;
    if v_effective_limit is not null and v_post.revision_rounds_used >= v_effective_limit then
      raise exception 'Keine Änderungsschleifen mehr übrig';
    end if;
  end if;

  if p_status = 'zurueckgestellt' then
    if v_effective_limit is null or v_post.revision_rounds_used < v_effective_limit then
      raise exception 'Zurückstellen ist erst möglich, wenn keine Änderungsschleifen mehr übrig sind';
    end if;
  end if;

  update public.posts
  set status = p_status,
      approved_by = case when p_status = 'freigegeben' then v_uid else approved_by end,
      approved_at = case when p_status = 'freigegeben' then now() else approved_at end,
      revision_rounds_used = case
        when p_status = 'aenderung_gewuenscht' then revision_rounds_used + 1
        else revision_rounds_used
      end
  where id = p_post_id;

  if coalesce(trim(p_comment), '') <> '' then
    insert into public.comments (post_id, author_id, body, categories)
    values (p_post_id, v_uid, p_comment, p_categories);
  end if;
end;
$$;

grant execute on function public.set_post_status(uuid, public.post_status, text, text[]) to authenticated;
