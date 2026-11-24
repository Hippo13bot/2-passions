# Architecture

## Deux applications séparées

- `apps/public` : consultation publique, aucun privilège d'écriture sur les contenus éditoriaux.
- `apps/admin` : interface privée, authentification Supabase et contrôle des rôles en base.
- Supabase : PostgreSQL, Auth et Storage partagés.
- GitHub : code source et déploiement du site public.
- Cloudflare Pages : hébergement indépendant de l'administration.

## Flux de publication

1. Un éditeur crée un dossier en brouillon.
2. Il ajoute des événements, documents, médias et sources.
3. Un vérificateur contrôle les affirmations et les références.
4. Un éditeur autorisé publie.
5. Le site public ne lit que les contenus dont le statut est `published`.
6. Les contributions externes arrivent dans une file privée et ne deviennent jamais publiques automatiquement.

## Entités principales

Mobilisation, établissement, événement, organisation, collectif, document et ressource sont représentés dans `entities` par un type et un slug. Les relations permettent de relier les établissements aux événements, aux sources et aux autres acteurs.

## Géographie

La latitude et la longitude sont facultatives. Par défaut, la précision est masquée. Une localisation publique doit faire l'objet d'une décision éditoriale spécifique. Ne jamais cartographier une personne, un déplacement individuel ou un point sensible.

## Recherche

La première version utilise une recherche locale de démonstration. La recherche full-text PostgreSQL, les filtres combinés et les facettes territoriales sont à développer après validation du schéma et des données.
