# 2 PASSIONS — socle technique

**ARCHIVER. DOCUMENTER. TRANSMETTRE.**

Monorepo contenant deux applications web distinctes :
- `apps/public` : site documentaire public.
- `apps/admin` : interface privée d'administration.
- `supabase/migrations` : schéma PostgreSQL et politiques de sécurité.
- `docs` : architecture, modèle éditorial, déploiement et feuille de route.

## État réel du projet

Ce ZIP est un **socle de développement exécutable**, pas une plateforme déjà mise en production.
Le site public dispose d'une première interface navigable et de contenus de démonstration explicitement identifiés.
L'administration dispose d'une interface de départ ; elle ne permet pas encore de publier réellement tant que Supabase n'est pas configuré.
La migration SQL pose les fondations des données et des règles d'accès, mais doit être testée dans un projet Supabase avant toute ouverture publique.

Aucun événement, chiffre, témoignage ou établissement mobilisé réel n'est prérempli. Les exemples de démonstration ne sont pas des données historiques.

## Prérequis

- Node.js 20 ou supérieur
- npm 10 ou supérieur
- Un compte GitHub pour le dépôt et le déploiement public
- Un projet Supabase pour la base, l'authentification et les fichiers

## Installation

```bash
npm install
cp apps/public/.env.example apps/public/.env.local
cp apps/admin/.env.example apps/admin/.env.local
npm run dev
```

- Site public : http://localhost:5173
- Administration : http://localhost:5174

Sans variables Supabase, les applications affichent leur état de configuration. Ne mettez jamais une clé `service_role` dans une application navigateur.

## Configuration Supabase

1. Créer un projet Supabase.
2. Ouvrir SQL Editor et exécuter `supabase/migrations/0001_initial_schema.sql`.
3. Configurer l'URL et la clé `anon` dans les deux fichiers `.env.local`.
4. Créer les comptes administrateurs dans Supabase Auth.
5. Attribuer les rôles depuis un environnement de confiance en suivant `docs/SECURITY.md`.
6. Configurer les buckets Storage et leurs politiques selon `docs/SECURITY.md`.

Les règles RLS sont activées dans la migration. Faire relire et tester les politiques avant la mise en ligne.

## Commandes

```bash
npm run dev
npm run build
npm run typecheck
```

## Déploiement

Voir `docs/DEPLOYMENT.md`. Les deux applications sont déployées séparément et utilisent la même base Supabase.

## Principes éditoriaux et de protection

- Ne jamais inventer une information pour remplir une fiche.
- Distinguer fait vérifié, source unique, déclaration, témoignage, estimation et information contestée.
- Conserver les sources originales et la date de consultation.
- Ne pas publier les noms de personnes mineures, coordonnées personnelles ou informations de localisation sensibles.
- Les contributions restent privées jusqu'à modération.
- Respecter droit d'auteur, droit à l'image, consentement et demandes de retrait.
- Les statistiques doivent exposer méthode, périmètre, sources et limites.

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/DATA-MODEL.md`
- `docs/EDITORIAL-CHARTER.md`
- `docs/SECURITY.md`
- `docs/ROADMAP.md`
- `docs/DEPLOYMENT.md`
