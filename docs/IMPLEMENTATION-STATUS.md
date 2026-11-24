# État d’implémentation — reprise fonctionnelle

Cette branche constitue une première version connectée. Elle ne doit pas être ouverte au public avant application des migrations et tests sur une instance Supabase isolée.

## Inclus
- Authentification Supabase avec récupération de session et contrôle du profil.
- Accès à l’administration refusé si aucun profil d’équipe n’est associé au compte.
- Tableau de bord alimenté par les enregistrements réels.
- Création et modification d’entités documentaires.
- Ajout de sources documentaires.
- Consultation et modération des contributions.
- Liste des membres et journal d’activité réservés aux administrateurs.
- Site public connecté : contenus publiés uniquement, recherche, filtres, fiches et sources associées.
- Migration séparée pour les rôles, RLS et journalisation.

## À réaliser avant ouverture publique
- Carte, chronologie, observatoires et statistiques méthodologiquement sourcées.
- Bibliothèque média, stockage privé des originaux, dérivés publics et contrôle des droits.
- Anonymisation avec validation humaine.
- Formulaires publics de contribution, signalement et correction.
- Tests RLS automatisés pour anon, moderator, fact_checker, editor et administrator.
- Sauvegardes et tests de restauration.
- Vérification juridique RGPD, droit à l’image, droit d’auteur et protection des mineurs.

## Migration
1. Sauvegarder le projet Supabase.
2. Appliquer 0001_initial_schema.sql si le schéma initial n’est pas déjà installé.
3. Appliquer 0002_role_permissions_and_audit.sql.
4. Créer le premier compte dans Supabase Auth.
5. Copier son UUID depuis Authentication > Users.
6. Dans SQL Editor, attribuer le rôle administrateur manuellement :

```sql
insert into public.profiles (id, display_name, role)
values ('UUID_DU_COMPTE_AUTH', 'Administration', 'administrator');
```

7. Tester les droits de chaque rôle et l’accès anonyme.
8. Configurer VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour les deux applications.

Ne jamais placer une clé service_role dans une application navigateur.