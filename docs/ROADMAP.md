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
- [x] Script d’intégration RLS pour les rôles et l’accès anonyme.\n- [ ] Exécuter les tests sur l’instance Supabase de préproduction.
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
- [x] Chronologie des événements publiés et carte territoriale avec précision géographique contrôlée.
- [ ] Recherche plein texte et facettes.

## Lot 4 — Archives et participation
- [x] Bibliothèque média, métadonnées, droits et crédits.
- [x] Original privé, dérivé privé signé après validation et contrôle humain par pixelisation manuelle.
- [x] Formulaire public de contribution protégé par Turnstile et file de modération.\n- [ ] Formulaires de signalement/retrait dédiés.
- [ ] Anti-robot, limitation de débit et procédure de retrait.

## Lot 5 — Observatoires et données
- [x] Quatre observatoires thématiques avec sources, méthode et limites.\n- [ ] Tableaux statistiques agrégés et séries temporelles.
- [ ] Méthodes, périmètres, limites et historique des indicateurs.
- [ ] Veille conforme aux conditions des sources.
- [ ] Tests de sauvegarde et restauration.

Aucune étape n’est réputée terminée sans tests et validation éditoriale, technique et juridique.