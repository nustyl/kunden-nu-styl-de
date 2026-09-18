-- =========================================================================
-- NU STYL Kundenportal — initiales Schema, RLS-Policies, Trigger
-- =========================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.profile_role as enum ('admin', 'client');
create type public.post_format as enum ('reel', 'beitrag', 'karussell', 'story');
create type public.post_status as enum (
  'entwurf',
  'zur_freigabe',
  'freigegeben',
  'aenderung_gewuenscht',
  'veroeffentlicht'
);
create type public.media_type as enum ('image', 'video');

-- ---------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  full_name text,
  role public.profile_role not null default 'client',
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  format public.post_format not null default 'beitrag',
  platforms text[] not null default '{}',
  caption text not null default '',
  hashtags text not null default '',
  publish_date date,
  approval_deadline date,
  status public.post_status not null default 'entwurf',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  r2_key text not null,
  type public.media_type not null,
  mime_type text not null,
  size bigint,
  sort_order integer not null default 0,
  width integer,
  height integer,
  duration numeric,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index posts_client_id_idx on public.posts(client_id);
create index posts_status_idx on public.posts(status);
create index posts_publish_date_idx on public.posts(publish_date);
create index post_media_post_id_idx on public.post_media(post_id);
create index comments_post_id_idx on public.comments(post_id);
create index profiles_client_id_idx on public.profiles(client_id);

-- ---------------------------------------------------------------------
-- updated_at Trigger für posts
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Neues auth.users -> profiles anlegen
-- Wird von supabase.auth.admin.inviteUserByEmail() mit user_metadata
-- { full_name, client_id, role } befüllt. Ohne Metadata: role='client'.
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, client_id, full_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::public.profile_role, 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Helper-Funktionen für RLS (security definer, um Rekursion auf
-- profiles zu vermeiden)
-- ---------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- RLS aktivieren
-- ---------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;

-- clients ---------------------------------------------------------------
create policy "admin verwaltet clients" on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

create policy "kunde sieht eigenen client" on public.clients
  for select using (id = public.my_client_id());

-- profiles ----------------------------------------------------------------
create policy "admin verwaltet profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "nutzer sieht eigenes profil" on public.profiles
  for select using (id = auth.uid());

-- posts -------------------------------------------------------------------
create policy "admin verwaltet posts" on public.posts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "kunde sieht eigene freigegebene posts" on public.posts
  for select using (
    client_id = public.my_client_id() and status <> 'entwurf'
  );

-- Kein direktes UPDATE für Kunden: Statusänderungen laufen ausschließlich
-- über die Funktion public.set_post_status() (siehe unten), damit Kunden
-- nur den Status ändern können und keine anderen Felder.

-- post_media ----------------------------------------------------------------
create policy "admin verwaltet post_media" on public.post_media
  for all using (public.is_admin()) with check (public.is_admin());

create policy "kunde sieht medien eigener posts" on public.post_media
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.client_id = public.my_client_id()
        and p.status <> 'entwurf'
    )
  );

-- comments ------------------------------------------------------------------
create policy "admin verwaltet comments" on public.comments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "kunde sieht kommentare eigener posts" on public.comments
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.client_id = public.my_client_id()
        and p.status <> 'entwurf'
    )
  );

create policy "kunde kommentiert eigene posts" on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.client_id = public.my_client_id()
        and p.status <> 'entwurf'
    )
  );

-- ---------------------------------------------------------------------
-- RPC: Statusänderung durch den Kunden (Freigeben / Änderung wünschen)
-- Security definer, prüft Berechtigung intern -> kein direktes UPDATE
-- auf posts für Kunden nötig.
-- ---------------------------------------------------------------------
create function public.set_post_status(
  p_post_id uuid,
  p_status public.post_status,
  p_comment text default null
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
  if p_status not in ('freigegeben', 'aenderung_gewuenscht') then
    raise exception 'Ungültiger Status für Kunden-Freigabe';
  end if;

  select client_id into v_client_id from public.profiles where id = v_uid;
  select client_id into v_post_client_id from public.posts where id = p_post_id;

  if v_client_id is null or v_post_client_id is null or v_client_id <> v_post_client_id then
    raise exception 'Kein Zugriff auf diesen Beitrag';
  end if;

  if p_status = 'aenderung_gewuenscht' and coalesce(trim(p_comment), '') = '' then
    raise exception 'Kommentar ist bei Änderungswunsch erforderlich';
  end if;

  update public.posts
  set status = p_status,
      approved_by = case when p_status = 'freigegeben' then v_uid else approved_by end,
      approved_at = case when p_status = 'freigegeben' then now() else approved_at end
  where id = p_post_id;

  if coalesce(trim(p_comment), '') <> '' then
    insert into public.comments (post_id, author_id, body)
    values (p_post_id, v_uid, p_comment);
  end if;
end;
$$;

grant execute on function public.set_post_status(uuid, public.post_status, text) to authenticated;
