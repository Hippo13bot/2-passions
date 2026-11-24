# État d’implémentation — reprise documentaire

## Implémenté dans la branche `reprise/modules-documentaires`
- Authentification Supabase, session et contrôle du profil avant l’accès à l’administration.
- CMS initial : création et modification des dossiers, ajout de sources, modération des contributions.
- Contrôle de vérification dédié au rôle fact_checker.
- Site public connecté : contenus publiés, recherche, filtres, fiches et sources.
- Carte avec RPC qui masque ou arrondit les coordonnées et liste des territoires ultramarins.
- Chronologie des événements avec statut annoncé, confirmé, reporté, annulé ou non confirmé.
- Quatre observatoires avec source, méthode, période, périmètre, limites et statut de vérification.
- Médiathèque avec originaux privés, dérivés privés, pixelisation manuelle et contrôles avant publication.
- Contributions publiques via Edge Function Turnstile, limitation de cinq envois par empreinte IP HMAC-SHA-256 sur quinze minutes et insertion privée.
- Migrations 0002 et 0003 pour les rôles, Storage, observatoires, RPC publiques et audit.
- Tests d’intégration RLS et vérification Deno de l’Edge Function.

## Contrôles automatisés
- `npm run typecheck` : réussi.
- `npm run build` : réussi pour le site public et l’administration.
- `deno check supabase/functions/submit-contribution/index.ts` : réussi.
- `supabase test db` sur l’instance Supabase réelle : non exécuté à ce stade.

## Configuration indispensable avant ouverture publique
1. Appliquer les migrations 0001, 0002 et 0003 sur une instance Supabase de préproduction.
2. Créer les comptes de test editor, fact_checker, moderator et administrator ; exécuter `supabase test db`.
3. Déployer `supabase/functions/submit-contribution`.
4. Configurer Turnstile : `VITE_TURNSTILE_SITE_KEY` dans les variables GitHub Actions ; `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` et `PUBLIC_SITE_ORIGIN` dans les secrets Supabase.
5. Tester les buckets privés, la génération des URL signées, l’import, la pixelisation et la publication conditionnée.
6. Tester sauvegardes et restauration ; faire vérifier RGPD, droit à l’image, droit d’auteur et protection des mineurs.

## Premier administrateur

Créer un compte dans Supabase Auth, copier son UUID depuis Authentication > Users puis attribuer le rôle manuellement dans SQL Editor :

```sql
insert into public.profiles (id, display_name, role)
values ('UUID_DU_COMPTE_AUTH', 'Administration', 'administrator');
```

Ne jamais placer une clé `service_role` dans une application navigateur. Les étapes détaillées figurent dans `docs/IMPLEMENTATION-MODULES.md`.