-- 2 PASSIONS — durcissement des rôles et traçabilité.
-- À appliquer après 0001_initial_schema.sql sur un projet Supabase de test.

create or replace function public.is_administrator()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() = 'administrator', false) $$;

create or replace function public.can_edit_content()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('administrator','editor'), false) $$;

create or replace function public.can_verify_content()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('administrator','editor','fact_checker'), false) $$;

create or replace function public.can_moderate_contributions()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('administrator','moderator'), false) $$;

-- Les anciennes politiques trop larges sont retirées.
drop policy if exists "team reads all entities" on public.entities;
drop policy if exists "team inserts entities" on public.entities;
drop policy if exists "team updates entities" on public.entities;
drop policy if exists "team manages sources" on public.sources;
drop policy if exists "team manages entity source links" on public.entity_sources;
drop policy if exists "team manages relations" on public.entity_relations;
drop policy if exists "team manages media" on public.media_assets;
drop policy if exists "team reviews contributions" on public.contributions;
drop policy if exists "team updates contributions" on public.contributions;
drop policy if exists "team reads profiles" on public.profiles;
drop policy if exists "team reads audit log" on public.audit_log;

create policy "authorized team reads all entities" on public.entities
for select to authenticated using (public.can_verify_content() or public.can_moderate_contributions());
create policy "editors create entities" on public.entities
for insert to authenticated with check (public.can_edit_content());
create policy "editors update entities" on public.entities
for update to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "administrators delete entities" on public.entities
for delete to authenticated using (public.is_administrator());

create policy "authorized team reads sources" on public.sources
for select to authenticated using (public.can_verify_content());
create policy "editors create sources" on public.sources
for insert to authenticated with check (public.can_edit_content());
create policy "editors update sources" on public.sources
for update to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "administrators delete sources" on public.sources
for delete to authenticated using (public.is_administrator());

create policy "editors manage entity source links" on public.entity_sources
for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "editors manage entity relations" on public.entity_relations
for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());
create policy "editors manage media metadata" on public.media_assets
for all to authenticated using (public.can_edit_content()) with check (public.can_edit_content());

create policy "moderators read contributions" on public.contributions
for select to authenticated using (public.can_moderate_contributions());
create policy "moderators update contributions" on public.contributions
for update to authenticated using (public.can_moderate_contributions()) with check (public.can_moderate_contributions());

create policy "users read own profile administrators read team" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_administrator());
create policy "administrators update profiles" on public.profiles
for update to authenticated using (public.is_administrator()) with check (public.is_administrator());

create policy "administrators read audit log" on public.audit_log
for select to authenticated using (public.is_administrator());

-- Un vérificateur ne peut modifier que le statut de vérification.
create or replace function public.enforce_fact_checker_scope()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.current_role() = 'fact_checker' then
    if (to_jsonb(new) - 'verification_status' - 'updated_at' - 'updated_by')
       is distinct from
       (to_jsonb(old) - 'verification_status' - 'updated_at' - 'updated_by') then
      raise exception 'Le rôle vérificateur ne peut modifier que le statut de vérification.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists entities_role_scope on public.entities;
create trigger entities_role_scope before update on public.entities
for each row execute function public.enforce_fact_checker_scope();

-- Les modifications des contenus et des sources sont historisées.
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  row_id text;
begin
  if tg_op = 'DELETE' then row_id := old.id::text;
  else row_id := new.id::text;
  end if;
  insert into public.audit_log(actor_id, action, table_name, record_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, row_id,
    jsonb_build_object('at', now(), 'role', public.current_role()));
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists audit_entities on public.entities;
create trigger audit_entities after insert or update or delete on public.entities
for each row execute function public.write_audit_log();
drop trigger if exists audit_sources on public.sources;
create trigger audit_sources after insert or update or delete on public.sources
for each row execute function public.write_audit_log();

-- Index utiles pour le CMS et le site public.
create index if not exists entities_published_date_idx on public.entities(editorial_status, event_date desc);
create index if not exists entities_search_idx on public.entities using gin (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body,'')));
create index if not exists contributions_created_idx on public.contributions(created_at desc);

-- NOTE : aucun administrateur n'est créé automatiquement. Le premier profil doit être
-- attribué manuellement par le propriétaire du projet depuis le SQL Editor, après création
-- du compte Auth, en vérifiant l'UUID exact de l'utilisateur.
