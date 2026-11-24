-- 2 PASSIONS — veille automatique, documents et équipe simplifiée
-- Migration additive : ne supprime aucune donnée existante.

alter table public.sources
  add column if not exists file_name text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists extracted_text text,
  add column if not exists abstract text,
  add column if not exists extraction_status text not null default 'not_applicable'
    check (extraction_status in ('not_applicable','uploaded','extracted','needs_ocr','failed'));

create table if not exists public.watch_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null,
  publisher text,
  topic text,
  enabled boolean not null default true,
  check_interval_minutes integer not null default 30 check (check_interval_minutes between 15 and 10080),
  last_checked_at timestamptz,
  last_error text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(feed_url)
);

create table if not exists public.watch_items (
  id uuid primary key default gen_random_uuid(),
  watch_source_id uuid not null references public.watch_sources(id) on delete cascade,
  guid text not null,
  item_url text,
  title text not null,
  author_label text,
  published_at timestamptz,
  excerpt text,
  content_text text,
  summary text,
  status text not null default 'pending' check (status in ('pending','in_review','kept','ignored')),
  detected_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_source_id uuid references public.sources(id) on delete set null,
  unique(watch_source_id,guid)
);

create index if not exists watch_items_status_date_idx on public.watch_items(status, published_at desc nulls last);
create index if not exists watch_items_source_date_idx on public.watch_items(watch_source_id, detected_at desc);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  extracted_text text,
  extraction_status text not null default 'uploaded'
    check (extraction_status in ('uploaded','extracted','needs_ocr','failed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(storage_path)
);

alter table public.watch_sources enable row level security;
alter table public.watch_items enable row level security;
alter table public.source_documents enable row level security;

drop policy if exists "editors manage watch sources" on public.watch_sources;
create policy "editors manage watch sources" on public.watch_sources
  for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

drop policy if exists "editors manage watch items" on public.watch_items;
create policy "editors manage watch items" on public.watch_items
  for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

drop policy if exists "editors manage source documents" on public.source_documents;
create policy "editors manage source documents" on public.source_documents
  for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'source-documents','source-documents',false,52428800,
  array[
    'application/pdf','image/jpeg','image/png','image/webp','image/tiff',
    'text/plain','text/html','application/rtf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "editors read source documents" on storage.objects;
create policy "editors read source documents" on storage.objects
  for select to authenticated using (bucket_id='source-documents' and public.can_edit_content());
drop policy if exists "editors upload source documents" on storage.objects;
create policy "editors upload source documents" on storage.objects
  for insert to authenticated with check (bucket_id='source-documents' and public.can_edit_content());
drop policy if exists "editors update source documents" on storage.objects;
create policy "editors update source documents" on storage.objects
  for update to authenticated using (bucket_id='source-documents' and public.can_edit_content())
  with check (bucket_id='source-documents' and public.can_edit_content());
drop policy if exists "administrators delete source documents" on storage.objects;
create policy "administrators delete source documents" on storage.objects
  for delete to authenticated using (bucket_id='source-documents' and public.is_administrator());

-- Cron et HTTP : le job planifié sera activé après ajout de la clé service_role dans Vault.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Les tables nouvellement créées doivent être explicitement exposées à PostgREST.
grant select, insert, update, delete on public.watch_sources, public.watch_items, public.source_documents to authenticated;
