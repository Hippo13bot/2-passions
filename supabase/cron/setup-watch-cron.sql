-- 2 PASSIONS — activation de la veille automatique toutes les 30 minutes
-- À exécuter une seule fois dans Supabase > SQL Editor.
-- Récupérer la clé service_role JWT depuis Project Settings > API Keys (Legacy keys).
-- Ne jamais la coller dans le dépôt GitHub, le navigateur ou une conversation.

select vault.create_secret(
  'https://pveodrhzvstvoywaytul.supabase.co',
  '2passions_project_url'
);

select vault.create_secret(
  'COLLER_ICI_LA_CLE_SERVICE_ROLE_LEGACY',
  '2passions_service_role_key'
);

-- Évite de créer plusieurs tâches portant le même nom.
select cron.unschedule(jobid)
from cron.job
where jobname = '2passions-watch-every-30-minutes';

select cron.schedule(
  '2passions-watch-every-30-minutes',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = '2passions_project_url'
      ) || '/functions/v1/watch-sources',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = '2passions_service_role_key'
        ),
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = '2passions_service_role_key'
        )
      ),
      body := '{"force": false}'::jsonb,
      timeout_milliseconds := 15000
    );
  $job$
);

-- Contrôle : la tâche doit apparaître avec la planification */30 * * * *.
select jobid, jobname, schedule, active
from cron.job
where jobname = '2passions-watch-every-30-minutes';
