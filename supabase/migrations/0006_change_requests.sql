-- =========================================================================
-- Änderungswünsche als feste Struktur statt als Kommentare
--
-- change_rounds:   eine Zeile pro Änderungsrunde eines Beitrags
--                  (Runde 1, 2, ...). Wird beim Klick auf "Änderungswunsch
--                  senden" angelegt und zählt als Änderungsschleife.
-- change_requests: die einzelnen Punkte einer Runde (z. B. "Slide 2 ·
--                  Design"). Ergänzungen und Textkorrekturen ändern
--                  NICHT die Anzahl der genutzten Änderungsschleifen.
-- =========================================================================

create table public.change_rounds (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  round_no integer not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_version integer,
  resolved_at timestamptz,
  unique (post_id, round_no)
);

comment on column public.change_rounds.resolved_version is
  'Version, in der die Runde umgesetzt wurde. NULL = Runde ist noch offen.';

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.change_rounds(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  section_key text not null,
  section_label text not null,
  category text not null,
  body text not null check (length(body) <= 5000),
  is_supplement boolean not null default false,
  sort_order integer not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

comment on column public.change_requests.is_supplement is
  'true = nachträglich ergänzt, während die Runde schon lief (zählt nicht als neue Runde).';
comment on column public.change_requests.done_at is
  'Von NU STYL als erledigt abgehakt. NULL = noch offen.';

create index change_rounds_post_id_idx on public.change_rounds(post_id);
create index change_requests_round_id_idx on public.change_requests(round_id);
create index change_requests_post_id_idx on public.change_requests(post_id);

-- ---------------------------------------------------------------------
-- RLS: Admin darf alles, Kunden nur lesen (Schreiben nur über die
-- Funktionen unten).
-- ---------------------------------------------------------------------
alter table public.change_rounds enable row level security;
alter table public.change_requests enable row level security;

create policy "admin verwaltet change_rounds" on public.change_rounds
  for all using (public.is_admin()) with check (public.is_admin());

create policy "kunde sieht runden eigener posts" on public.change_rounds
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = change_rounds.post_id
        and p.client_id = public.my_client_id()
        and p.status <> 'entwurf'
    )
  );

create policy "admin verwaltet change_requests" on public.change_requests
  for all using (public.is_admin()) with check (public.is_admin());

create policy "kunde sieht aenderungswuensche eigener posts" on public.change_requests
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = change_requests.post_id
        and p.client_id = public.my_client_id()
        and p.status <> 'entwurf'
    )
  );

-- ---------------------------------------------------------------------
-- Hilfsfunktion: effektives Änderungsschleifen-Limit eines Beitrags
-- (Format-Override, sonst Standard, plus Admin-Bonus). NULL = unbegrenzt.
-- ---------------------------------------------------------------------
create function public.post_revision_limit(p_post_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post record;
  v_default integer;
  v_overrides jsonb;
  v_key text;
  v_max integer;
begin
  select * into v_post from public.posts where id = p_post_id;
  select max_revision_rounds, max_revision_rounds_by_format
  into v_default, v_overrides
  from public.clients where id = v_post.client_id;

  v_key := case when v_post.format = 'karussell' then 'beitrag' else v_post.format::text end;
  if v_overrides ? v_key then
    v_max := (v_overrides ->> v_key)::integer;
  else
    v_max := v_default;
  end if;

  return case when v_max is null then null else v_max + v_post.revision_rounds_bonus end;
end;
$$;

revoke execute on function public.post_revision_limit(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Punkte (jsonb-Array) in eine Runde schreiben.
-- Erwartet [{section_key, section_label, category, body}, ...]
-- ---------------------------------------------------------------------
create function public._insert_change_items(
  p_round_id uuid,
  p_post_id uuid,
  p_items jsonb,
  p_supplement boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start integer;
  v_count integer;
begin
  select coalesce(max(sort_order), -1) + 1 into v_start
  from public.change_requests where round_id = p_round_id;

  insert into public.change_requests
    (round_id, post_id, author_id, section_key, section_label, category, body, is_supplement, sort_order)
  select p_round_id, p_post_id, auth.uid(),
         left(trim(e.item ->> 'section_key'), 50),
         left(trim(coalesce(e.item ->> 'section_label', '')), 100),
         left(trim(e.item ->> 'category'), 100),
         left(trim(e.item ->> 'body'), 5000),
         p_supplement,
         v_start + (e.ord - 1)::integer
  from jsonb_array_elements(p_items) with ordinality as e(item, ord)
  where jsonb_typeof(e.item) = 'object'
    and coalesce(trim(e.item ->> 'body'), '') <> ''
    and coalesce(trim(e.item ->> 'section_key'), '') <> ''
    and coalesce(trim(e.item ->> 'category'), '') <> '';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public._insert_change_items(uuid, uuid, jsonb, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Kunde: Freigeben / Änderung wünschen / Zurückstellen.
-- Nur aus "Zur Freigabe" oder "Zurückgestellt" heraus. Solange
-- Änderungswünsche bearbeitet werden, ist nichts davon möglich.
-- ---------------------------------------------------------------------
create function public.submit_post_response(
  p_post_id uuid,
  p_status public.post_status,
  p_items jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_client_id uuid;
  v_post record;
  v_limit integer;
  v_round_id uuid;
  v_count integer;
begin
  if p_status not in ('freigegeben', 'aenderung_gewuenscht', 'zurueckgestellt') then
    raise exception 'Ungültiger Status für Kunden-Freigabe';
  end if;

  select client_id into v_client_id from public.profiles where id = v_uid;
  select * into v_post from public.posts where id = p_post_id for update;

  if v_client_id is null or v_post.id is null or v_client_id <> v_post.client_id then
    raise exception 'Kein Zugriff auf diesen Beitrag';
  end if;

  if v_post.status = 'aenderung_gewuenscht' then
    raise exception 'Deine Änderungswünsche werden gerade bearbeitet. Du kannst sie ergänzen.';
  end if;
  if v_post.status not in ('zur_freigabe', 'zurueckgestellt') then
    raise exception 'Dieser Beitrag wartet gerade nicht auf deine Freigabe.';
  end if;

  v_limit := public.post_revision_limit(p_post_id);

  if p_status = 'aenderung_gewuenscht' then
    if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
      raise exception 'Bitte beschreibe mindestens eine gewünschte Änderung';
    end if;
    if v_limit is not null and v_post.revision_rounds_used >= v_limit then
      raise exception 'Keine Änderungsschleifen mehr übrig';
    end if;
  end if;

  if p_status = 'zurueckgestellt' then
    if v_limit is null or v_post.revision_rounds_used < v_limit then
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

  if p_status = 'aenderung_gewuenscht' then
    insert into public.change_rounds (post_id, round_no, created_by)
    values (p_post_id, v_post.revision_rounds_used + 1, v_uid)
    returning id into v_round_id;

    v_count := public._insert_change_items(v_round_id, p_post_id, p_items, false);
    if v_count = 0 then
      raise exception 'Bitte beschreibe mindestens eine gewünschte Änderung';
    end if;
  end if;
end;
$$;

grant execute on function public.submit_post_response(uuid, public.post_status, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Kunde: Ergänzung zur laufenden Runde (zählt NICHT als neue Runde).
-- ---------------------------------------------------------------------
create function public.add_change_supplement(
  p_post_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_client_id uuid;
  v_post record;
  v_round_id uuid;
  v_count integer;
begin
  select client_id into v_client_id from public.profiles where id = v_uid;
  select * into v_post from public.posts where id = p_post_id;

  if v_client_id is null or v_post.id is null or v_client_id <> v_post.client_id then
    raise exception 'Kein Zugriff auf diesen Beitrag';
  end if;
  if v_post.status <> 'aenderung_gewuenscht' then
    raise exception 'Ergänzungen sind nur möglich, solange Änderungswünsche bearbeitet werden.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Bitte trag mindestens eine Ergänzung ein';
  end if;

  select id into v_round_id from public.change_rounds
  where post_id = p_post_id and resolved_at is null
  order by round_no desc limit 1;

  if v_round_id is null then
    raise exception 'Keine offene Änderungsrunde gefunden';
  end if;

  v_count := public._insert_change_items(v_round_id, p_post_id, p_items, true);
  if v_count = 0 then
    raise exception 'Bitte trag mindestens eine Ergänzung ein';
  end if;
end;
$$;

grant execute on function public.add_change_supplement(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Text eines Punkts korrigieren (z. B. Rechtschreibung). Ändert nie die
-- Änderungsschleifen. Kunde: nur eigene Punkte einer offenen Runde.
-- Admin: immer.
-- ---------------------------------------------------------------------
create function public.edit_change_request(
  p_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if coalesce(trim(p_body), '') = '' then
    raise exception 'Der Text darf nicht leer sein';
  end if;
  if length(trim(p_body)) > 5000 then
    raise exception 'Der Text ist zu lang';
  end if;

  select r.author_id, cr.resolved_at into v_row
  from public.change_requests r
  join public.change_rounds cr on cr.id = r.round_id
  where r.id = p_id;

  if not found then
    raise exception 'Änderungswunsch nicht gefunden';
  end if;

  if not public.is_admin() then
    if v_row.author_id is distinct from auth.uid() then
      raise exception 'Du kannst nur deine eigenen Änderungswünsche bearbeiten';
    end if;
    if v_row.resolved_at is not null then
      raise exception 'Diese Runde ist abgeschlossen und kann nicht mehr bearbeitet werden';
    end if;
  end if;

  update public.change_requests
  set body = trim(p_body), edited_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.edit_change_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Punkt löschen. Kunde: nur eigene Punkte einer offenen Runde, und nicht
-- den letzten verbleibenden Punkt (die Runde braucht mindestens einen).
-- Admin: immer.
-- ---------------------------------------------------------------------
create function public.delete_change_request(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_remaining integer;
begin
  select r.author_id, r.round_id, cr.resolved_at into v_row
  from public.change_requests r
  join public.change_rounds cr on cr.id = r.round_id
  where r.id = p_id;

  if not found then
    raise exception 'Änderungswunsch nicht gefunden';
  end if;

  if not public.is_admin() then
    if v_row.author_id is distinct from auth.uid() then
      raise exception 'Du kannst nur deine eigenen Änderungswünsche löschen';
    end if;
    if v_row.resolved_at is not null then
      raise exception 'Diese Runde ist abgeschlossen und kann nicht mehr bearbeitet werden';
    end if;
    select count(*) into v_remaining from public.change_requests where round_id = v_row.round_id;
    if v_remaining <= 1 then
      raise exception 'Der letzte Punkt einer Runde kann nicht gelöscht werden. Bearbeite ihn stattdessen.';
    end if;
  end if;

  delete from public.change_requests where id = p_id;
end;
$$;

grant execute on function public.delete_change_request(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Runde automatisch abschließen, sobald der Beitrag "Änderung gewünscht"
-- verlässt (Überarbeitung gesendet oder Status manuell geändert).
-- ---------------------------------------------------------------------
create function public.close_change_rounds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'aenderung_gewuenscht' and new.status <> 'aenderung_gewuenscht' then
    update public.change_rounds
    set resolved_version = new.version,
        resolved_at = now()
    where post_id = new.id and resolved_at is null;
  end if;
  return new;
end;
$$;

create trigger posts_close_change_rounds
  after update of status on public.posts
  for each row execute function public.close_change_rounds();
