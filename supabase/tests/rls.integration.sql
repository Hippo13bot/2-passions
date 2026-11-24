-- Tests RLS d’intégration — exécuter après les trois migrations sur Supabase local ou préproduction.
-- Pré-requis : profils de test existants pour editor, fact_checker, moderator et administrator.
-- Commande : supabase test db
begin;
do $$ begin
 if not exists(select 1 from public.profiles where role='editor') then raise exception 'Fixture manquante : créer un profil editor.'; end if;
 if not exists(select 1 from public.profiles where role='fact_checker') then raise exception 'Fixture manquante : créer un profil fact_checker.'; end if;
 if not exists(select 1 from public.profiles where role='moderator') then raise exception 'Fixture manquante : créer un profil moderator.'; end if;
 if not exists(select 1 from public.profiles where role='administrator') then raise exception 'Fixture manquante : créer un profil administrator.'; end if;
end $$;
select set_config('test.editor_id',(select id::text from public.profiles where role='editor' limit 1),true);
select set_config('test.fact_checker_id',(select id::text from public.profiles where role='fact_checker' limit 1),true);
select set_config('test.moderator_id',(select id::text from public.profiles where role='moderator' limit 1),true);
select set_config('test.admin_id',(select id::text from public.profiles where role='administrator' limit 1),true);
select set_config('test.published_id',gen_random_uuid()::text,true);
select set_config('test.draft_id',gen_random_uuid()::text,true);
select set_config('test.contribution_id',gen_random_uuid()::text,true);
insert into public.entities(id,entity_type,slug,title,editorial_status,verification_status,location_precision,latitude,longitude)
values
 (current_setting('test.published_id')::uuid,'event','rls-test-published-'||replace(gen_random_uuid()::text,'-',''),'RLS test published','published','cross_checked','hidden',48.8566,2.3522),
 (current_setting('test.draft_id')::uuid,'event','rls-test-draft-'||replace(gen_random_uuid()::text,'-',''),'RLS test draft','draft','unverified','hidden',48.8566,2.3522);
insert into public.contributions(id,contribution_type,message,status,public_anonymous)
values(current_setting('test.contribution_id')::uuid,'correction','Private RLS fixture contribution','pending',true);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
do $$ begin
 if (select count(*) from public.entities where id=current_setting('test.published_id')::uuid) <> 1 then raise exception 'Anon doit lire un contenu publié.'; end if;
 if (select count(*) from public.entities where id=current_setting('test.draft_id')::uuid) <> 0 then raise exception 'Anon ne doit pas lire un brouillon.'; end if;
 if exists(select 1 from public.contributions where id=current_setting('test.contribution_id')::uuid) then raise exception 'Anon ne doit jamais lire une contribution.'; end if;
 if exists(select 1 from public.published_map_points() where id=current_setting('test.published_id')::uuid) then raise exception 'Un point caché ne doit jamais apparaître sur la carte.'; end if;
 if not has_function_privilege('anon','public.published_map_points()','EXECUTE') then raise exception 'La RPC cartographique doit être publique.'; end if;
 if (select count(*) from storage.objects where bucket_id='media-originals') <> 0 then raise exception 'Anon ne doit pas lire les originaux privés.'; end if;
end $$;
do $$ begin
 begin
  insert into public.entities(entity_type,slug,title) values ('event','rls-anon-write-'||replace(gen_random_uuid()::text,'-',''),'Tentative anon');
  raise exception 'Anon ne doit pas créer une entité.';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.contributions(contribution_type,message,status) values ('correction','Tentative insertion directe anon','pending');
  raise exception 'Anon doit passer par la fonction Turnstile, pas par PostgREST.';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub',current_setting('test.editor_id'),true);
do $$ begin
 insert into public.entities(entity_type,slug,title,created_by,updated_by)
 values ('event','rls-editor-write-'||replace(gen_random_uuid()::text,'-',''),'Création éditeur',auth.uid(),auth.uid());
 if not exists(select 1 from public.entities where id=current_setting('test.published_id')::uuid) then raise exception 'L’éditeur doit lire les entités.'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub',current_setting('test.fact_checker_id'),true);
update public.entities set verification_status='cross_checked' where id=current_setting('test.draft_id')::uuid;
do $$ begin
 begin
  update public.entities set title='Modification interdite' where id=current_setting('test.draft_id')::uuid;
  raise exception 'Le vérificateur ne doit pas modifier le titre.';
 exception when raise_exception then if sqlerrm='Le vérificateur ne doit pas modifier le titre.' then raise; end if; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub',current_setting('test.moderator_id'),true);
do $$ begin
 if not exists(select 1 from public.contributions where id=current_setting('test.contribution_id')::uuid) then raise exception 'Le modérateur doit lire les contributions.'; end if;
 begin
  insert into public.entities(entity_type,slug,title) values ('event','rls-moderator-write-'||replace(gen_random_uuid()::text,'-',''),'Tentative modérateur');
  raise exception 'Le modérateur ne doit pas créer une entité.';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub',current_setting('test.admin_id'),true);
do $$ begin
 if not exists(select 1 from public.audit_log where record_id=current_setting('test.published_id')) then raise exception 'L’administrateur doit lire le journal d’audit.'; end if;
end $$;
reset role;
rollback;