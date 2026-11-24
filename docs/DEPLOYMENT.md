# Déploiement

## Site public — GitHub Pages
1. Créer un dépôt GitHub et y pousser le contenu du ZIP.
2. Dans les paramètres du dépôt, activer GitHub Pages via GitHub Actions.
3. Ajouter un workflow Vite adapté au chemin de déploiement choisi.
4. Configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les secrets/actions ou variables de build.
5. Configurer le `base` Vite si le site est publié sous `https://compte.github.io/nom-du-depot/`.

Le site public peut être dans un dépôt public sur GitHub Free. Les données privées ne doivent jamais être stockées dans le dépôt.

## Administration — Cloudflare Pages
1. Importer le même dépôt dans Cloudflare Pages.
2. Build command : `npm install && npm run build -w @2passions/admin`.
3. Output directory : `apps/admin/dist`.
4. Définir les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
5. Déployer sur un sous-domaine distinct.

## Variables
Seules l'URL Supabase et la clé `anon` sont prévues dans le navigateur. La clé `service_role` est strictement serveur et ne doit jamais être ajoutée à ces applications.


## Contribution publique et Turnstile

Configurer la variable GitHub Actions `VITE_TURNSTILE_SITE_KEY` pour le site public. Déployer `supabase/functions/submit-contribution` avec `supabase functions deploy submit-contribution`, puis définir les secrets `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` et `PUBLIC_SITE_ORIGIN` avec `supabase secrets set`. La clé secrète Turnstile et la clé `service_role` restent exclusivement côté serveur.

Appliquer les migrations 0001, 0002 et 0003 dans cet ordre. La migration 0003 crée les buckets privés et les politiques Storage. Voir `docs/IMPLEMENTATION-MODULES.md`.
