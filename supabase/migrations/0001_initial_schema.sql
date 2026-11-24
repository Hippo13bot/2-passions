-- 2 PASSIONS — schéma initial. À tester sur un projet isolé avant production.
create extension if not exists pgcrypto;

create type public.editorial_status as enum ('draft','review','published','archived','rejected');
create type public.verification_status as enum ('unverified','single_source','cross_checked','contested','not_verifiable');
create type public.contribution_status as enum ('pending','in_review','accepted','rejected','withdrawn');
create type public.profile_role as enum ('administrator','editor','fact_checker','moderator');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.profile_role not null default 'moderator',
  created_at timestamptz not null default now()
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('mobilisation','establishment','event','organisation','collective','document','resource')),
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  territory text,
  region text,
  department text,
  city text,
  public_location_label text,
  latitude double precision,
  longitude double precision,
  location_precision text not null default 'hidden' check (location_precision in ('hidden','approximate','public')),
  editorial_status public.editorial_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  event_date date,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  publisher text,
  author_label text,
  published_on date,
  consulted_at timestamptz,
  source_type text,
  notes text,
  verification_status public.verification_status not null default 'unverified',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.entity_sources (
  entity_id uuid not null references public.entities(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  relation_note text,
  primary key (entity_id, source_id)
);

create table public.entity_relations (
  id uuid primary key default gen_random_uuid(),
  from_entity uuid not null references public.entities(id) on delete cascade,
  to_entity uuid not null references public.entities(id) on delete cascade,
  relation_type text not null,
  description text,
  created_at timestamptz not null default now(),
  check (from_entity <> to_entity),
  unique (from_entity, to_entity, relation_type)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  storage_path text not null,
  public_derivative_path text,
  media_type text not null check (media_type in ('image','video','audio','document')),
  caption text,
  credit text,
  original_source_url text,
  rights_status text not null default 'unknown',
  consent_reviewed boolean not null default false,
  anonymization_reviewed boolean not null default false,
  editorial_status public.editorial_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  target_entity uuid references public.entities(id) on delete set null,
  contribution_type text not null,
  message text not null,
  source_url text,
  contact_email text,
  public_anonymous boolean not null default true,
  status public.contribution_status not null default 'pending',
  moderator_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  table_name text not null,
  record_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index entities_type_status_idx on public.entities(entity_type, editorial_status);
create index entities_date_idx on public.entities(event_date desc);
create index sources_status_idx on public.sources(verification_status);
create index contributions_status_idx on public.contributions(status, created_at);

-- RLS : le public ne voit que les entités publiées.
alter table public.profiles enable row level security;
alter table public.entities enable row level security;
alter table public.sources enable row level security;
alter table public.entity_sources enable row level security;
alter table public.entity_relations enable row level security;
alter table public.media_assets enable row level security;
alter table public.contributions enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_role()
returns public.profile_role language sql stable security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.has_editor_access()
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce(public.current_role() in ('administrator','editor','fact_checker','moderator'), false) $$;

create policy "public reads published entities" on public.entities
for select using (editorial_status = 'published');
create policy "team reads all entities" on public.entities
for select to authenticated using (public.has_editor_access());
create policy "team inserts entities" on public.entities
for insert to authenticated with check (public.has_editor_access());
create policy "team updates entities" on public.entities
for update to authenticated using (public.has_editor_access()) with check (public.has_editor_access());

create policy "public reads sources attached to published entities" on public.sources
for select using (exists (
  select 1 from public.entity_sources es join public.entities e on e.id = es.entity_id
  where es.source_id = sources.id and e.editorial_status = 'published'
));
create policy "team manages sources" on public.sources
for all to authenticated using (public.has_editor_access()) with check (public.has_editor_access());

create policy "public reads published entity source links" on public.entity_sources
for select using (exists(select 1 from public.entities e where e.id = entity_id and e.editorial_status='published'));
create policy "team manages entity source links" on public.entity_sources
for all to authenticated using (public.has_editor_access()) with check (public.has_editor_access());

create policy "public reads relations between published entities" on public.entity_relations
for select using (
 exists(select 1 from public.entities e where e.id=from_entity and e.editorial_status='published')
 and exists(select 1 from public.entities e where e.id=to_entity and e.editorial_status='published')
);
create policy "team manages relations" on public.entity_relations
for all to authenticated using (public.has_editor_access()) with check (public.has_editor_access());

create policy "public reads approved media derivatives" on public.media_assets
for select using (
 editorial_status='published' and public_derivative_path is not null
 and consent_reviewed=true and anonymization_reviewed=true
);
create policy "team manages media" on public.media_assets
for all to authenticated using (public.has_editor_access()) with check (public.has_editor_access());

-- Contributions are insert-only for anonymous visitors; never publicly readable.
create policy "anyone can submit contribution" on public.contributions
for insert to anon, authenticated with check (status='pending' and reviewed_by is null and reviewed_at is null);
create policy "team reviews contributions" on public.contributions
for select to authenticated using (public.has_editor_access());
create policy "team updates contributions" on public.contributions
for update to authenticated using (public.has_editor_access()) with check (public.has_editor_access());

create policy "team reads profiles" on public.profiles
for select to authenticated using (public.has_editor_access() or id=auth.uid());
create policy "team reads audit log" on public.audit_log
for select to authenticated using (public.current_role()='administrator');

-- Important: initial policy set is a baseline. Add role-specific permissions, audit triggers,
-- storage bucket policies, rate limits, CAPTCHA and tests before production.
