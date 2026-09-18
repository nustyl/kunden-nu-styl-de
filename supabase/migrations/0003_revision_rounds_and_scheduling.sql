-- =========================================================================
-- Änderungsschleifen, Terminvorschlag, Kategorien für Änderungswünsche,
-- Kunden-Archivierung
-- =========================================================================

-- clients ---------------------------------------------------------------
alter table public.clients
  add column max_revision_rounds integer default 2,
  add column archived_at timestamptz;

comment on column public.clients.max_revision_rounds is
  'Anzahl erlaubter Änderungsschleifen pro Beitrag für diesen Kunden. NULL = unbegrenzt.';

-- posts -------------------------------------------------------------------
alter table public.posts
  add column revision_rounds_used integer not null default 0,
  add column revision_rounds_bonus integer not null default 0;

comment on column public.posts.revision_rounds_used is
  'Wird bei jedem Klick auf "Änderung gewünscht" um 1 erhöht (nicht bei reinen Kommentaren).';
comment on column public.posts.revision_rounds_bonus is
  'Vom Admin gewährte Zusatz-Runden über das Kunden-Limit hinaus (Kulanz).';

-- publish_date von date auf timestamptz erweitern (Datum + Uhrzeit)
alter table public.posts
  alter column publish_date type timestamptz using publish_date::timestamptz;

-- Terminvorschlag durch den Kunden
alter table public.posts
  add column proposed_publish_date timestamptz,
  add column proposed_publish_date_by uuid references public.profiles(id) on delete set null,
  add column proposed_publish_date_status text
    check (proposed_publish_date_status in ('offen', 'akzeptiert', 'abgelehnt'));

-- comments ------------------------------------------------------------------
alter table public.comments
  add column categories text[];

comment on column public.comments.categories is
  'Ausgewählte Kategorien bei "Änderung gewünscht" (z. B. Grafisch, Caption, Hashtags). NULL bei normalen Kommentaren.';

-- ---------------------------------------------------------------------
-- set_post_status neu: prüft Änderungsschleifen-Limit, zählt Runden,
-- speichert Kategorien, erlaubt "zurueckgestellt" nur wenn keine Runden
-- mehr übrig sind.
-- ---------------------------------------------------------------------
drop function if exists public.set_post_status(uuid, public.post_status, text);

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

  select max_revision_rounds into v_max_rounds
  from public.clients where id = v_client_id;

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

-- ---------------------------------------------------------------------
-- RPC: Kunde schlägt neue Posting-Zeit vor (muss vom Admin bestätigt werden)
-- ---------------------------------------------------------------------
create function public.propose_publish_date(
  p_post_id uuid,
  p_date timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_post_client_id uuid;
  v_uid uuid := auth.uid();
begin
  select client_id into v_client_id from public.profiles where id = v_uid;
  select client_id into v_post_client_id from public.posts where id = p_post_id;

  if v_client_id is null or v_post_client_id is null or v_client_id <> v_post_client_id then
    raise exception 'Kein Zugriff auf diesen Beitrag';
  end if;

  update public.posts
  set proposed_publish_date = p_date,
      proposed_publish_date_by = v_uid,
      proposed_publish_date_status = 'offen'
  where id = p_post_id;
end;
$$;

grant execute on function public.propose_publish_date(uuid, timestamptz) to authenticated;
