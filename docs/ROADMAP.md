# Feuille de route

## Lot 0 — Socle technique
- [x] Deux applications séparées et monorepo.
- [x] Identité graphique initiale et architecture Supabase.
- [x] Documentation de cadrage.

## Lot 1 — Infrastructure et accès
- [x] Authentification Supabase avec session persistante.
- [x] Contrôle du profil avant accès à l’administration.
- [x] Rôles de base et migration RLS séparée.
- [ ] Appliquer et tester les migrations sur une instance de préproduction.
- [ ] Tests RLS automatisés par rôle et accès anonyme.
- [ ] Buckets Storage privés et dérivés publics validés.

## Lot 2 — CMS éditorial
- [x] CRUD initial des entités documentaires.
- [x] Ajout de sources documentaires.
- [x] File de modération des contributions.
- [x] Journalisation des changements d’entités et de sources.
- [ ] Relations entre entités, événements et sources dans l’interface.
- [ ] Historique détaillé et restauration de versions.
- [ ] Fiches établissements et organisations complètes.

## Lot 3 — Site public
- [x] Lecture des contenus publiés depuis Supabase.
- [x] Recherche et filtres par type.
- [x] Fiche documentaire et sources associées.
- [ ] Navigation par URL, pages partageables et référencement.
- [ ] Chronologie interactive et carte territoriale sécurisée.
- [ ] Recherche plein texte et facettes.

## Lot 4 — Archives et participation
- [ ] Bibliothèque média, métadonnées, droits et crédits.
- [ ] Original privé, dérivé public et contrôle humain de l’anonymisation.
- [ ] Formulaire public de contribution, signalement et correction.
- [ ] Anti-robot, limitation de débit et procédure de retrait.

## Lot 5 — Observatoires et données
- [ ] Observatoires thématiques et statistiques sourcées.
- [ ] Méthodes, périmètres, limites et historique des indicateurs.
- [ ] Veille conforme aux conditions des sources.
- [ ] Tests de sauvegarde et restauration.

Aucune étape n’est réputée terminée sans tests et validation éditoriale, technique et juridique.