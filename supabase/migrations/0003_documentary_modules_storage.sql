-- 2 PASSIONS — cartographie, chronologie, observatoires, médias et stockage sécurisé.
-- À appliquer après les migrations 0001 et 0002.

alter table public.entities add column if not exists event_status text not null default 'confirmed'
  check (event_status in ('announced','confirmed','postponed','cancelled','unknown'));
alter table public.media_assets add column if not exists alt_text text;
alter table public.media_assets add column if not exists file_name text;
alter table public.media_assets add column if not exists mime_type text;
alter table public.media_assets add column if not exists file_size bigint;
alter table public.media_assets add column if not exists rights_notes text;
alter table public.media_assets add column if not exists uploaded_by uuid references public.profiles(id);
alter table public.media_assets add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.media_assets add column if not exists reviewed_at timestamptz;

create table if not exists public.observatory_entries (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('repression','education','media','public_freedoms')),
  title text not null,
  claim text not null,
  indicator text,
  value_numeric numeric,
  value_label text,
  unit text,
  period_start date,
  period_end date,
  geography text,
  methodology text not null,
  limitations text,
  verification_status public.verification_status not null default 'unverified',
  editorial_status public.editorial_status not null default 'draft',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start)
);
create table if not exists public.observatory_sources (
  entry_id uuid not null references public.observatory_entries(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  primary key (entry_id, source_id)
);
alter table public.observatory_entries enable row level security;
alter table public.observatory_sources enable row level security;
create policy "public reads published observatory entries" on public.observatory_entries
  for select using (editorial_status = 'published');
create policy "authorized team reads observatory entries" on public.observatory_entries
  for select to authenticated using (public.can_verify_content() or public.is_administrator());
create policy "editors create observatory entries" on public.observatory_entries
  for insert to authenticated with check (public.can_edit_content());
create policy "editors update observatory entries" on public.observatory_entries
  for update to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "administrators delete observatory entries" on public.observatory_entries
  for delete to authenticated using (public.is_administrator());
create policy "public reads sources of published observatories" on public.observatory_sources
  for select using (exists (select 1 from public.observatory_entries o where o.id = entry_id and o.editorial_status = 'published'));
create policy "editors manage observatory source links" on public.observatory_sources
  for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

-- Les vérificateurs peuvent modifier uniquement le statut de vérification ; le trigger
-- de la migration 0002 interdit les changements de contenu pour ce rôle.
drop policy if exists "editors update entities" on public.entities;
create policy "editors and fact-checkers update entities" on public.entities
  for update to authenticated using (public.can_verify_content()) with check (public.can_verify_content());

create or replace function public.enforce_observatory_publication()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.editorial_status = 'published' then
    if length(trim(coalesce(new.methodology,''))) < 12 then
      raise exception 'Publication observatoire refusée : méthodologie insuffisante.';
    end if;
    if new.verification_status = 'unverified' then
      raise exception 'Publication observatoire refusée : niveau de vérification requis.';
    end if;
    if not exists(select 1 from public.observatory_sources os where os.entry_id = new.id) then
      raise exception 'Publication observatoire refusée : au moins une source doit être associée.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists observatory_publication_checks on public.observatory_entries;
create trigger observatory_publication_checks before insert or update on public.observatory_entries
  for each row execute function public.enforce_observatory_publication();

-- Le média ne peut être publié que si le dossier parent est déjà publié.
create or replace function public.enforce_media_publication_checks()
returns trigger language plpgsql set search_path = public as $
begin
  if new.editorial_status = 'published' and (new.public_derivative_path is null or new.consent_reviewed is not true
     or new.anonymization_reviewed is not true or new.rights_status <> 'cleared') then
    raise exception 'Publication refusée : dérivé, droits, consentement et anonymisation doivent être validés.';
  end if;
  if new.editorial_status = 'published' and not exists(select 1 from public.entities e where e.id = new.entity_id and e.editorial_status = 'published') then
    raise exception 'Publication média refusée : le dossier associé doit être publié.';
  end if;
  if new.editorial_status = 'published' then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$;
drop trigger if exists media_publication_checks on public.media_assets;
create trigger media_publication_checks before insert or update on public.media_assets
  for each row execute function public.enforce_media_publication_checks();
-- Buckets : originaux non publics, dérivés accessibles uniquement après validation éditoriale.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-originals','media-originals',false,52428800,array['image/jpeg','image/png','image/webp','image/heic','video/mp4','audio/mpeg','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-public','media-public',false,26214400,array['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "team reads media originals" on storage.objects;
create policy "team reads media originals" on storage.objects for select to authenticated
  using (bucket_id = 'media-originals' and public.can_edit_content());
drop policy if exists "editors upload media originals" on storage.objects;
create policy "editors upload media originals" on storage.objects for insert to authenticated
  with check (bucket_id = 'media-originals' and public.can_edit_content());
drop policy if exists "editors update media originals" on storage.objects;
create policy "editors update media originals" on storage.objects for update to authenticated
  using (bucket_id = 'media-originals' and public.can_edit_content()) with check (bucket_id = 'media-originals' and public.can_edit_content());
drop policy if exists "administrators delete media originals" on storage.objects;
create policy "administrators delete media originals" on storage.objects for delete to authenticated
  using (bucket_id = 'media-originals' and public.is_administrator());
drop policy if exists "public reads approved derivatives" on storage.objects;
create policy "public reads approved derivatives" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media-public' and exists (
    select 1 from public.media_assets m join public.entities e on e.id = m.entity_id
    where m.public_derivative_path = name and m.editorial_status = 'published'
      and m.rights_status = 'cleared' and m.consent_reviewed and m.anonymization_reviewed
      and e.editorial_status = 'published'
  ));
drop policy if exists "editors read all derivatives" on storage.objects;
create policy "editors read all derivatives" on storage.objects for select to authenticated
  using (bucket_id = 'media-public' and public.can_edit_content());

drop policy if exists "public reads sources attached to published entities" on public.sources;
create policy "public reads sources attached to published records" on public.sources
  for select using (
    exists (select 1 from public.entity_sources es join public.entities e on e.id = es.entity_id
      where es.source_id = sources.id and e.editorial_status = 'published')
    or exists (select 1 from public.observatory_sources os join public.observatory_entries o on o.id = os.entry_id
      where os.source_id = sources.id and o.editorial_status = 'published')
  );
drop policy if exists "editors upload public derivatives" on storage.objects;
create policy "editors upload public derivatives" on storage.objects for insert to authenticated
  with check (bucket_id = 'media-public' and public.can_edit_content());
drop policy if exists "editors update public derivatives" on storage.objects;
create policy "editors update public derivatives" on storage.objects for update to authenticated
  using (bucket_id = 'media-public' and public.can_edit_content()) with check (bucket_id = 'media-public' and public.can_edit_content());
drop policy if exists "administrators delete public derivatives" on storage.objects;
create policy "administrators delete public derivatives" on storage.objects for delete to authenticated
  using (bucket_id = 'media-public' and public.is_administrator());

-- RPC publique : aucune coordonnée cachée n'est renvoyée. La précision approximative
-- est arrondie à 0,1 degré (ordre de grandeur : plusieurs kilomètres).
create or replace function public.published_map_points()
returns table (id uuid, title text, entity_type text, region text, department text, city text, latitude double precision, longitude double precision)
language sql stable security definer set search_path = public
as $$
  select e.id, e.title, e.entity_type, e.region, e.department, e.city,
    case when e.location_precision = 'public' then e.latitude else round(e.latitude::numeric,1)::double precision end,
    case when e.location_precision = 'public' then e.longitude else round(e.longitude::numeric,1)::double precision end
  from public.entities e
  where e.editorial_status = 'published' and e.latitude is not null and e.longitude is not null
    and e.location_precision in ('public','approximate')
$$;
revoke all on function public.published_map_points() from public;
grant execute on function public.published_map_points() to anon, authenticated;

-- RPC publique : ne retourne que les dérivés validés et jamais le chemin des originaux.
create or replace function public.published_media_for_entity(p_entity_id uuid default null)
returns table (id uuid, entity_id uuid, public_derivative_path text, media_type text, caption text, credit text, alt_text text)
language sql stable security definer set search_path = public
as $$
  select m.id, m.entity_id, m.public_derivative_path, m.media_type, m.caption, m.credit, m.alt_text
  from public.media_assets m join public.entities e on e.id = m.entity_id
  where m.editorial_status = 'published' and m.public_derivative_path is not null
    and m.rights_status = 'cleared' and m.consent_reviewed and m.anonymization_reviewed
    and e.editorial_status = 'published' and (p_entity_id is null or m.entity_id = p_entity_id)
$$;
revoke all on function public.published_media_for_entity(uuid) from public;
grant execute on function public.published_media_for_entity(uuid) to anon, authenticated;

-- Journalisation des observatoires.
create or replace function public.write_observatory_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare row_id text;
begin
  if tg_op = 'DELETE' then row_id := old.id::text; else row_id := new.id::text; end if;
  insert into public.audit_log(actor_id, action, table_name, record_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, row_id, jsonb_build_object('at',now(),'role',public.current_role()));
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
drop trigger if exists audit_observatory_entries on public.observatory_entries;
create trigger audit_observatory_entries after insert or update or delete on public.observatory_entries
  for each row execute function public.write_observatory_audit_log();

-- NOTE : le CAPTCHA/anti-robot doit être activé côté serveur avant d'ouvrir le formulaire
-- à grande échelle. La clé secrète Turnstile ne doit jamais être exposée au navigateur.