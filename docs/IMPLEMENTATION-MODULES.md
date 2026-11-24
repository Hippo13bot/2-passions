# Modules documentaires — installation et validation

Cette version ajoute la cartographie, la chronologie, les observatoires, la médiathèque avec pixelisation manuelle et le formulaire de contribution protégé. Les modules ne deviennent opérationnels qu’après application de la migration et configuration des services externes.

## 1. Migrations Supabase

Sur un projet de préproduction, appliquer dans l’ordre :
1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_role_permissions_and_audit.sql`
3. `supabase/migrations/0003_documentary_modules_storage.sql`

La troisième migration ajoute `event_status`, les observatoires, les RPC publiques, les politiques Storage, les buckets privés et les contrôles de publication. Elle retire également l’insertion anonyme directe dans `contributions` : les envois passent désormais par l’Edge Function protégée.

**Ne pas appliquer directement en production sans sauvegarde et test de restauration.** Vérifier que les politiques Storage existantes ne donnent pas des droits plus larges que celles du projet.

## 2. Cartographie et chronologie

- La chronologie lit uniquement les événements publiés et distingue annoncé, confirmé, reporté, annulé et non confirmé.
- `published_map_points()` ne renvoie que les lieux publiés avec une précision `public` ou `approximate`.
- Les lieux `hidden` ne sont pas retournés. Les coordonnées `approximate` sont arrondies à 0,1 degré.
- La carte schématique représente la métropole ; les lieux ultramarins sont affichés dans une liste distincte.
- Les coordonnées individuelles, itinéraires et lieux sensibles ne doivent jamais être saisis.

## 3. Observatoires

Quatre thèmes sont disponibles : répression, éducation, médias et libertés publiques. Chaque entrée comprend une affirmation, un indicateur éventuel, une valeur, une période, un périmètre, une méthodologie, des limites, un statut éditorial et un niveau de vérification.

La publication est refusée si la méthodologie est trop courte, si le niveau de vérification reste `unverified` ou si aucune source n’est associée. Une contestation peut être publiée uniquement si elle est clairement signalée et contextualisée.

## 4. Médiathèque et anonymisation

Les buckets `media-originals` et `media-public` sont tous deux privés. Le dérivé est servi par URL signée uniquement si le média et son dossier sont publiés et si les droits, le consentement et l’anonymisation sont validés.

L’outil d’administration permet de tracer des rectangles sur une image : les zones sélectionnées sont pixelisées dans le dérivé JPEG. Ce n’est **pas** une détection automatique des visages. La personne qui importe doit vérifier manuellement les visages, plaques, badges, écrans, reflets et arrière-plans. Les trois cases de validation sont des déclarations éditoriales, pas une preuve juridique automatique.

Formats pris en charge par l’éditeur actuel : JPEG, PNG et WebP. L’original est conservé dans le bucket privé ; seul le dérivé est candidat à publication.

## 5. Contributions publiques et Turnstile

Le formulaire public ne peut envoyer une contribution qu’après validation Cloudflare Turnstile. L’Edge Function `submit-contribution` vérifie le jeton côté serveur, applique une limite de cinq envois par empreinte IP HMAC-SHA-256 (fenêtre de quinze minutes), puis insère une contribution `pending` avec la clé de service. Le secret Turnstile sert de clé HMAC ; seule l’empreinte est conservée, jamais l’adresse IP brute. La clé de service n’est jamais envoyée au navigateur.

### Configuration

1. Créer un widget Cloudflare Turnstile et autoriser les domaines exacts du site public.
2. Ajouter `VITE_TURNSTILE_SITE_KEY` comme variable GitHub Actions du dépôt (Settings → Secrets and variables → Actions → Variables).
3. Pour le développement local, ajouter `VITE_TURNSTILE_SITE_KEY=...` dans `apps/public/.env.local`.
4. Déployer la fonction :

```bash
supabase functions deploy submit-contribution
```

5. Définir les secrets côté Supabase :

```bash
supabase secrets set TURNSTILE_SECRET_KEY=... TURNSTILE_ALLOWED_HOSTNAMES=exemple.fr,www.exemple.fr PUBLIC_SITE_ORIGIN=https://exemple.fr
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis à l’environnement Edge Functions par Supabase. Si le projet les gère différemment, les définir uniquement dans les secrets de fonctions, jamais dans Vite, GitHub Pages ou le navigateur.

6. Republier le site public pour intégrer la variable `VITE_TURNSTILE_SITE_KEY`.

Sans clé de site, le formulaire reste volontairement désactivé. Si Turnstile ne se valide pas, vérifier le domaine autorisé, le nom d’hôte retourné et les secrets de la fonction.

## 6. Tests RLS

Le script `supabase/tests/rls.integration.sql` teste l’accès anonyme, l’isolation des brouillons et contributions, l’insertion éditoriale, le périmètre du vérificateur, les droits du modérateur, la lecture du journal par l’administrateur et l’absence de lecture des originaux Storage.

### Préparer les comptes de test

Sur une instance Supabase locale ou de préproduction isolée, créer quatre utilisateurs Auth de test, puis leurs profils avec les rôles `editor`, `fact_checker`, `moderator` et `administrator`. Ne pas réutiliser les comptes de production.

Exemple d’attribution après création des utilisateurs dans Auth :

```sql
insert into public.profiles (id, display_name, role)
select id, email, case
  when email = 'editor-test@example.invalid' then 'editor'::public.profile_role
  when email = 'checker-test@example.invalid' then 'fact_checker'::public.profile_role
  when email = 'moderator-test@example.invalid' then 'moderator'::public.profile_role
  when email = 'admin-test@example.invalid' then 'administrator'::public.profile_role
end
from auth.users
where email in ('editor-test@example.invalid','checker-test@example.invalid','moderator-test@example.invalid','admin-test@example.invalid')
on conflict (id) do update set role = excluded.role;
```

Remplacer les adresses d’exemple par celles des quatre comptes de test créés dans l’instance isolée.

Exécuter ensuite :

```bash
supabase test db
```

Le script utilise une transaction et termine par `ROLLBACK`. Un résultat positif en local ne remplace pas le test de la configuration de préproduction : vérifier également les buckets, les secrets de fonctions, le domaine Turnstile et les permissions réelles.

## 7. Conditions avant ouverture publique

- Migrations appliquées et testées sur préproduction.
- RLS vérifiées avec les quatre rôles et `anon`.
- Turnstile actif sur le domaine public et Edge Function déployée.
- Buckets Storage privés ; aucun original accessible publiquement.
- Publication média testée avec droits, consentement, anonymisation et dossier parent publiés.
- Sauvegarde et restauration Supabase testées.
- Vérification éditoriale et juridique des procédures de protection des mineurs, droit à l’image et conservation des données.