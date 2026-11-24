# Feuille de route

## Lot 0 — Socle livré dans ce ZIP
- Deux applications web séparées.
- Charte graphique de base (Anton, Inter, IBM Plex Mono ; rouge #C62026, charbon #111111, blanc cassé #F4F2EE).
- Première page publique avec contenus de démonstration clairement signalés.
- Première interface d'administration et formulaire de connexion Supabase.
- Schéma SQL initial et documentation.

## Lot 1 — Infrastructure réelle
- Créer Supabase et appliquer la migration.
- Revoir les RLS et politiques Storage.
- Créer comptes et rôles.
- Vérifier les builds et les tests de sécurité.

## Lot 2 — CMS éditorial
- CRUD complet pour dossiers, établissements, événements, organisations, documents et ressources.
- Gestion des sources et liens.
- Workflow brouillon → vérification → publication.
- Historique de modifications et journal d'audit.

## Lot 3 — Site public connecté
- Pages détaillées et relations entre entités.
- Recherche PostgreSQL, filtres combinés et facettes.
- Carte et chronologie alimentées uniquement par des données publiées.
- Pages établissements structurées selon le cahier des charges.

## Lot 4 — Archives visuelles et participation
- Upload sécurisé, dérivés, crédits et droits.
- Outil d'anonymisation avec validation humaine et export.
- Formulaires de contribution, signalement et correction.
- Modération et retrait.

## Lot 5 — Modules avancés
- Statistiques méthodologiquement documentées.
- Solidarité et mise en relation sécurisée.
- Veille RSS et collecte conforme aux conditions des plateformes.
- Détection de doublons et assistance à la classification, toujours avec validation humaine.

Aucune étape n'est réputée terminée sans tests et validation.
