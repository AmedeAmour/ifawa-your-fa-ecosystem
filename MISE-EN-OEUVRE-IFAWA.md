# Modifications locales — 14 septembre 2026

## Ajustements de l’accueil et fiche pilote

À la demande de l’utilisateur, les pastilles de création passent à 11 px et 24 px
de hauteur, avec des fonds terre cuite, vert et doré. Les filtres du fil conservent
leur taille et leur palette. Le bouton flottant Services est rétabli pour mettre
les offres en avant, en complément du menu de compte.

Une fiche pilote est accessible sur `/fa/gbe-medji`, sous l’hypothèse que le nom
dicté « Prémédi » désigne Gbé Mêdji. Présentation, enseignements à documenter,
repères et sources sont regroupés dans un dossier avec sommaire. Le contenu
documentaire s’appuie sur une notice du LAAB et sur le contexte général de l’Ifa
décrit par l’UNESCO ; aucun récit, interdit ou avis de praticien n’est inventé.
Le modèle et le nom restent à valider par l’utilisateur avant toute duplication.
Les données sont locales, sans écriture Supabase. Affichage de l’accueil et du
dossier, ainsi que navigation du sommaire vers les sources, vérifiés sur mobile.

## Complément : menu de compte mobile

La photo de l’en-tête ouvre désormais un menu compact : profil, dossiers Fa,
services, parcours, contribution, confidentialité et déconnexion. Un cercle discret
et un chevron indiquent l’ouverture possible. Le bouton de déconnexion isolé et le
bouton flottant Services ont été retirés.

Vérification réalisée dans le navigateur intégré sur le compte connecté : rendu
mobile, ouverture du menu, fermeture avec Échap et retour du focus sur la photo,
navigation vers les dossiers avec fermeture du menu. TypeScript et lint des composants
modifiés réussis. La déconnexion réelle n’a pas été déclenchée pour conserver la session.

L’accès au navigateur intégré a été rétabli pour ce contrôle. Supabase y affiche
la page de connexion après une session OAuth expirée ; l’accès Chrome échoue encore
et le connecteur Supabase refuse l’accès à Ifawa2. Aucune modification de base distante
n’a été effectuée. Le contrôle visuel complet des autres écrans reste à faire.

Prévisualisation : http://127.0.0.1:8080/ (`npm run dev -- --host 127.0.0.1 --port 8080`).

## Réalisé dans le code

- Identité ivoire, terre cuite et forêt conservée ; contraste renforcé, titres Inter, logo Anton, textes et commandes agrandis, cartes et formulaires harmonisés.
- Navigation mobile avec libellés, marges de sécurité et commandes tactiles ; animations réduites selon les préférences du système.
- Inscription en trois étapes sans parcours prérempli fictif ; connexion, récupération du mot de passe et confirmation mieux explicitées.
- Connexion sans écrasement du profil, état local isolé par compte, stockage navigateur facultatif.
- Profil modifiable, onglets distincts, historique trié, dossiers sélectionnables avec résultats issus des demandes réelles. Suppression des écrans d’administration et de résultats simulés.
- Fil chargé progressivement ; commentaires/réactions limités aux publications chargées ; recherche des publications ; favoris et masquage sur l’appareil.
- Menus de publication, modification, suppression avec confirmation, partage et formulaire de signalement. Les erreurs de sauvegarde conservent les saisies.
- Actualisation périodique des messages et du fil sur les écrans visibles ; envoi des messages confirmé par le serveur avant effacement du texte.
- Images contrôlées (JPG/PNG/WebP, 5 Mo) ; échec du stockage signalé sans incorporer une image en base64 dans une publication.
- Prix libellés FCFA (XOF), présentés comme indicatifs. L’application ne traite aucun paiement.
- Fiches de bibliothèque explicitement annoncées en préparation ; une URL de signe/service inconnue ne présente plus une autre fiche.

## Dépendances serveur non déployées

Le connecteur a refusé l’accès au projet utilisé par l’application, `ejaiflgcspbowtsywyqc` (Ifawa2). Aucun changement distant n’a été appliqué et le schéma réel n’a pas été confirmé.

`supabase/ifawa2-hardening.sql` est une proposition transactionnelle, non testée sur Postgres. Comparer d’abord le schéma et les politiques réels au contrat local, puis tester sur une copie. Le script n’est pas destiné à être rejoué : les noms de politiques/index signalent un doublon au lieu de masquer un état inconnu. Ne pas réappliquer ensuite l’ancien contrat `ifawa2-schema.sql`.

Ce script prépare : restrictions de lecture/adhésion aux conversations, création atomique par RPC, accusés de lecture, protection des statuts de contributions et de demandes, unicité des connexions dans les deux sens, signalements, dates de modification et index.

La création d’une **nouvelle conversation** attend le RPC `start_direct_conversation`. Les conversations existantes restent consultables selon les autorisations actuelles. Le **signalement** attend la table `post_reports` et une organisation réelle du traitement par la modération.

Les préférences de visibilité restent désactivées : le script ferme la lecture directe des détails Fa aux autres membres, mais n’implémente pas encore le partage champ par champ. Ne pas annoncer la confidentialité comme effective avant contrôle de la base réelle. Le script ne crée volontairement pas `ifawa_security_version=1`.

La récupération de compte exige que l’URL `/connexion?recovery=1` soit autorisée dans les redirections Supabase Auth, sur les domaines effectivement utilisés.

## Contrôles serveur à réaliser sur une copie

Utiliser trois comptes A, B et C, sans clé de service dans le navigateur :

1. A et B connectés : créer simultanément une conversation dans les deux sens, obtenir le même identifiant et exactement deux membres.
2. C : lecture des messages et ajout direct comme membre refusés ; A ne peut pas déplacer sa participation vers une autre conversation. A peut modifier son propre `last_read_at` uniquement.
3. A : contribution `approved`, demande `completed` ou contenant un résultat à l’insertion refusées ; demandes et contributions normales acceptées.
4. B : accepter une demande reçue sans pouvoir changer ses participants ; A ne peut pas s’auto-accepter. Détecter les éventuelles paires inversées existantes avant l’index unique.
5. A : lecture de ses détails Fa autorisée ; B/C : lecture directe refusée, y compris après installation sur les anciennes politiques permissives.
6. A : signalement accepté, second signalement du même contenu refusé ; B/C : signalements d’A invisibles.

## Limites restant ouvertes

- Le navigateur intégré permet désormais les contrôles mobiles connectés. Bibliothèque, recherche et ouverture des rubriques d’une fiche vérifiées le 14 septembre ; les autres parcours doivent conserver leurs contrôles propres.
- Modération avec rôles, blocage des membres, documents privés des dossiers, contenus éditoriaux sourcés, notifications persistantes entre appareils et offres commerciales structurées restent à compléter.
- Les favoris concernent les publications chargées et sont stockés sur l’appareil. Ils ne sont pas synchronisés entre appareils. Les saisies sont conservées après erreur d’envoi, mais pas garanties après fermeture de l’onglet.
- La recherche de membres et l’historique des messages conservent des limites de chargement ; une pagination serveur dédiée reste nécessaire pour de gros volumes.
- Aucun déploiement, paiement, message réel à un tiers, commit ou push n’a été effectué.

## Vérification locale

Commandes : `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.

Résultats du 14 septembre : contrôle TypeScript réussi, 6 tests réussis,
lint sans erreur (6 avertissements Fast Refresh dans les composants UI existants),
compilation de production réussie. Les routes `/`, `/connexion` et `/accueil`
répondent HTTP 200 en local. Ces réponses HTTP ne constituent pas une validation visuelle
ni une validation des parcours authentifiés.

Les tests de régression couvrent l’isolation des comptes, le stockage navigateur indisponible, la reconnexion sans réécriture du profil, l’échec de lecture du profil et l’envoi avec session expirée. Ils utilisent des doublures Supabase : ils ne valident pas les politiques de la base distante.

## Bibliothèque et recherche — 14 septembre 2026

- Champ commun de recherche de 40 px, arrondi en pilule. Aucune suggestion avant saisie ; recherche dès le premier caractère, noms avec ou sans accents, numéros et services du catalogue. Les publications sont filtrées sur leur texte visible.
- Bibliothèque : cartes avec les noms uniquement. Les 16 signes-mères et Tchè-Tula disposent de fiches complètes, structurées en synthèse, profil et rubriques dépliables.
- Corpus extrait de la référence fournie, 17 fiches et 76 devises. Test de fidélité ligne par ligne réussi. Les anciens textes fictifs des signes sont supprimés.
- Modèle préparé pour 256 fiches, avec un statut distinct pour le messager. Aucun nom ni texte inventé pour les fiches restantes.
- SQL et raccordement de lecture préparés : voir references/README.md. Import distant non effectué : le connecteur Supabase refuse toujours l’accès administratif à Ifawa2. Le corpus local est utilisé tant que VITE_FA_CORPUS_REMOTE n’est pas activé.
- Contrôles : neuf tests réussis, TypeScript réussi ; bibliothèque, recherche initiale vide, recherche par lettre et par numéro, effacement et ouverture des devises vérifiés dans le navigateur intégré en largeur mobile.
Compilation de production réussie après relance hors bac à sable (le premier essai était bloqué par Windows : spawn EPERM). Lint des fichiers concernés sans erreur. Aucun déploiement effectué.

## 15 septembre 2026 — Réseau, messagerie et corpus distant

L’accès à Ifawa2 a été rétabli. Le schéma fa_sign_documents et les 17 fiches ont été importés : 16 signes-mères, Tchè-Tula et 76 devises. La lecture sous le rôle authenticated et l’absence de droit INSERT client ont été vérifiées. Le chargement distant est désormais actif par défaut avec copie locale de secours. Cette intervention ne déploie pas les autres propositions de durcissement décrites plus haut.

Réseau : onglets Découvrir, Invitations et Connexions, cartes membres simplifiées et recherche harmonisée. Messages : liste filtrable, présentation des conversations inspirée de Messenger, bulles différenciées et brouillons séparés par conversation. Fa : les noms utilisent des capsules de 40 px, avec le même arrondi que la recherche. Le bouton Services reste présent.

Validation : TypeScript, ESLint, neuf tests et compilation de production réussis. Contrôle visuel effectué dans le navigateur intégré en format mobile, avec vérification des filtres du Réseau et des conversations non lues. Aucun message de test envoyé à un membre.

## Version 7 — signe libre et accueil épuré

La page de bienvenue conserve les deux parcours et les accès à la connexion ; les blocs image, découverte et installation ont été retirés. Le parcours initié collecte le signe et l’année, puis la satisfaction et la présentation, avant les identifiants du compte.

Le signe peut être sélectionné dans les suggestions ou saisi librement (120 caractères maximum). La saisie libre est également disponible dans les paramètres du profil. Les signes reconnus conservent leur lien avec fa_signs ; les autres sont enregistrés dans profile_fa_details.custom_sign_name et relus après reconnexion, sans créer de contenu éditorial.

Migration distante add_profile_custom_sign_name appliquée sur Ifawa2. Lecture/écriture propriétaire vérifiée sous le rôle authenticated dans une transaction annulée. Les politiques existantes n’ont pas été modifiées ; leurs limites de confidentialité documentées précédemment restent ouvertes. Les conseillers Supabase signalent toujours des points existants sur les fonctions et la configuration Auth, sans alerte spécifique à cette colonne.

Validation : TypeScript, lint des composants et de l’authentification, 19 tests réussis. Saisie d’un signe hors catalogue et conservation lors du retour vérifiées dans le navigateur local. Aucun compte de test créé.
