# 2 PASSIONS — ARCHIVER. DOCUMENTER. TRANSMETTRE.

Monorepo contenant deux applications web distinctes partageant un projet Supabase.
- `apps/public` : site documentaire public.
- `apps/admin` : administration privée.
- `supabase/migrations` : schéma PostgreSQL et règles RLS.
- `docs` : documentation produit, éditoriale et technique.

## Installation locale
Prérequis : Node.js 20+ et npm 10+.
```bash
npm ci
cp apps/public/.env.example apps/public/.env.local
cp apps/admin/.env.example apps/admin/.env.local
npm run dev
```
Public : http://localhost:5173 — Administration : http://localhost:5174

Dans les deux fichiers .env.local, renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
Ne jamais ajouter la clé service_role à une application navigateur, au dépôt ou aux variables Vite.

## Base de données
Sur une instance Supabase de préproduction, appliquer dans l’ordre :
1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_role_permissions_and_audit.sql`

Créer les comptes dans Supabase Auth. Le profil et le rôle du premier administrateur sont attribués manuellement ; voir `docs/IMPLEMENTATION-STATUS.md` et `docs/IMPLEMENTATION-MODULES.md`.

## Commandes
```bash
npm run dev
npm run typecheck
npm run build
```

## Documentation
Consulter `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/EDITORIAL-CHARTER.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/ROADMAP.md` et `docs/IMPLEMENTATION-STATUS.md`.

## État du produit
Le CMS initial et le site public connecté sont en cours de reprise. La cartographie, la chronologie, les observatoires, la médiathèque, l’anonymisation manuelle et le formulaire de contribution protégé sont implémentés dans la branche de reprise. Leur activation exige la migration 0003, la configuration Turnstile et les tests RLS sur une instance Supabase isolée. Cette version n’est pas certifiée prête pour une ouverture publique.