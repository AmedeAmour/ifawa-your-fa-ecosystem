# Persistance des lectures — 15 septembre 2026

## Statut

Le code client et le schéma sont en place. La migration `persist_user_read_receipts` a été appliquée à Ifawa2 le 15 septembre 2026 après reconnexion du connecteur.

Les tests distants sous le rôle `authenticated`, dans une transaction annulée, confirment la lecture et l’écriture de ses propres marqueurs, le refus des lectures/insertions/modifications entre deux comptes, et la conservation de la date la plus récente. Un marqueur réel de conversation a ensuite été synchronisé par l’application dans la table distante.

Les marqueurs locaux, limités aux identifiants et dates de lecture, restent séparés par compte et survivent à la déconnexion. Les profils, publications et contenus des conversations sont toujours effacés des caches privés à la déconnexion. Les écritures distantes échouées restent en attente et sont réessayées lors du chargement suivant.

## Vérification complémentaire sur un second appareil

Ouvrir une conversation, puis reconnecter le même compte sur un autre appareil. Le badge doit rester effacé jusqu'à un nouveau message. La persistance distante et l’isolation ont été vérifiées ; un second appareil physique n'a pas été utilisé pendant cette intervention.

La cloche affiche uniquement les activités hors messages privés. Les messages disposent de leur propre compteur. Le profil est chargé indépendamment des compteurs : aucun accueil « Non initié » n'est affiché avant sa résolution.
