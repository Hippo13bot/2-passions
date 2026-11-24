# 2 PASSIONS — activation de la veille automatique

1. Appliquer la migration `0004_watch_documents_team.sql`.
2. Déployer la fonction Supabase `watch-sources`.
3. Ouvrir Supabase > SQL Editor et exécuter `supabase/cron/setup-watch-cron.sql` après avoir remplacé le marqueur par la clé **service_role legacy**.
4. Vérifier que la requête finale retourne le job `2passions-watch-every-30-minutes` avec `active = true`.
5. Consulter les exécutions dans Supabase > Integrations > Cron.

La clé service_role doit rester dans Vault. Ne jamais l'ajouter au code du site, à GitHub ou à une variable `VITE_*`.

## Limites de la première version

- La veille interroge les flux RSS et Atom déclarés dans l'administration.
- Un flux est vérifié au plus selon son intervalle configuré (30 minutes par défaut).
- Les doublons sont évités à l'aide d'une empreinte du GUID, de l'URL ou du titre.
- Le résumé est un extrait automatique du texte fourni par le flux. Ce n'est pas un résumé IA et il ne constitue pas une vérification.
- Les pages sans flux RSS/Atom ne sont pas aspirées. Les réseaux sociaux nécessitent des connecteurs dédiés et autorisés.
- Les éléments détectés restent privés et en attente de validation humaine.

## Documents importés

Les fichiers originaux sont déposés dans le bucket privé `source-documents`. Les fichiers texte simples sont indexés à l'import. Les PDF et images sont stockés et leur texte peut être ajouté dans le champ d'extraction du centre documentaire. L'OCR automatique n'est pas activé dans cette version : il faudra intégrer un moteur OCR ou un service dédié avant de promettre l'extraction automatique des scans.

## Gestion de l'équipe

L'interface recherche le compte existant par adresse e-mail et crée/met à jour son profil de rôle. La personne doit avoir un compte Supabase Auth au préalable. La fonction `manage-team` utilise la clé privilégiée uniquement côté serveur et contrôle que l'appelant est administrateur.
