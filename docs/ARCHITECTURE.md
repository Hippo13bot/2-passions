# Architecture

## Deux applications séparées
- `apps/public` : consultation des contenus publiés, recherche, carte, chronologie, observatoires et contributions.
- `apps/admin` : authentification Supabase, CMS, médiathèque et modération.
- Supabase : PostgreSQL, Auth, Storage privé et Edge Functions.
- GitHub Pages : site public ; Cloudflare Pages : administration.

## Publication éditoriale
1. Un éditeur crée un dossier et associe des sources.
2. Un vérificateur qualifie le niveau de preuve.
3. L’éditeur publie le dossier.
4. Le public ne lit que les enregistrements publiés.
5. Les contributions arrivent par une Edge Function protégée par Turnstile et restent privées jusqu’à modération.

## Carte et géographie
`published_map_points()` n’expose que les lieux de dossiers publiés. Les lieux masqués sont exclus et les coordonnées approximatives sont arrondies côté serveur. La carte métropolitaine est accompagnée d’une liste dédiée aux territoires ultramarins.

## Médias
Les originaux et dérivés sont dans des buckets privés. La médiathèque produit un dérivé JPEG avec pixelisation manuelle de zones sélectionnées. Une URL signée n’est délivrée au public que si le média et son dossier sont publiés, les droits sont validés, et le consentement et l’anonymisation sont contrôlés.

## Observatoires
Les indicateurs thématiques sont stockés séparément, associés à des sources, une période, un périmètre, une méthodologie, des limites et un statut de vérification. La publication est bloquée sans source ni méthode.

## Sécurité
Les politiques RLS différencient administrateur, éditeur, vérificateur, modérateur et visiteur anonyme. Les Edge Functions seules utilisent la clé de service. Voir `SECURITY.md` et `IMPLEMENTATION-MODULES.md`.
