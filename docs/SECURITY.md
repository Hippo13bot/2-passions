# Sécurité, confidentialité et protection des personnes

## Avant toute mise en ligne
- Tester les politiques RLS sur des comptes anon, moderator, editor et administrator.
- Activer la vérification d'e-mail et une politique de mot de passe robuste.
- Activer MFA pour les administrateurs lorsque possible.
- Restreindre les comptes privilégiés et réviser périodiquement les accès.
- Ajouter limitation de débit et protection anti-robot sur les formulaires publics.
- Ne jamais exposer la clé `service_role` dans le navigateur ou dans Git.
- Mettre en place sauvegardes exportées indépendantes et tests de restauration.
- Configurer les politiques Storage : originaux privés, dérivés publics validés uniquement.
- Ajouter des journaux d'audit et une procédure de réponse aux incidents.

## Attribution des rôles
Ne pas laisser les utilisateurs choisir leur rôle. La création/attribution des profils privilégiés doit être réalisée par une procédure contrôlée, depuis le SQL Editor ou un environnement serveur sécurisé. Ne pas créer de compte administrateur par défaut.

## Médias
L'original reste privé. La version dérivée n'est publique qu'après contrôle des droits, crédits, consentement et anonymisation. Le floutage automatique éventuel ne remplace jamais la vérification humaine.

## Mineurs et données personnelles
Ne pas publier de noms et prénoms de mineurs, coordonnées privées, horaires individuels, listes de participants, informations de déplacement ou éléments susceptibles de permettre des représailles. Limiter les données collectées et définir une durée de conservation. Prévoir une procédure de retrait et de signalement.

## Conformité
Faire vérifier le dispositif au regard du RGPD, du droit à l'image, du droit d'auteur, des règles relatives aux mineurs et des obligations de publication applicables. Ce document est un cadre technique, pas un avis juridique.
