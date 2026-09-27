# Audit IFAWA — 13 septembre 2026

**État : analyse du code et du schéma local réalisée ; inspection visuelle dans Chrome et vérification de la base déployée en attente d’accès.**

Ce rapport distingue les constats démontrés par le dépôt, les risques qui dépendent de la configuration Supabase déployée et les recommandations de design. Aucun écran n’a pu être observé dans le navigateur : le connecteur échoue avant de lister les onglets avec `Unable to load browser request-header policy`. Il serait donc incorrect de présenter les recommandations suivantes comme le résultat de captures mobile.

Le serveur de développement a démarré sur `http://127.0.0.1:8080/` après autorisation de sortir du bac à sable Windows. Le démarrage seul ne valide ni le rendu, ni les parcours.

## 1. Appréciation générale

IFAWA a un positionnement identifiable : connaissance du Fa, communauté, mise en relation, services et espace personnel. Les habitudes sociales sont présentes : fil, publications, réactions, commentaires, partage, invitations, profil et messages. L’identité ivoire / terre cuite / vert forêt mérite d’être conservée.

Le dépôt représente toutefois une transition inachevée entre prototype et produit connecté. La priorité est de rendre chaque promesse de l’interface vraie, de protéger les informations personnelles et de simplifier la lecture mobile. Ajouter beaucoup de fonctionnalités maintenant amplifierait cette incohérence.

Le niveau « plateforme internationale » doit se traduire par des gestes familiers, une lecture confortable, des actions fiables, des erreurs compréhensibles et des paramètres réellement respectés. Une esthétique plus décorative ne suffira pas.

## 2. Architecture comprise

| Couche | Implémentation observée | Conséquence |
|---|---|---|
| Interface | React 19, TanStack Start/Router, Tailwind 4, primitives Radix/shadcn, Lucide | Application web avec rendu serveur et navigation cliente |
| Navigation | Routes dans `src/routes`, enveloppe commune `Shell.tsx` | Cinq destinations mobiles ; navigation latérale sur grand écran |
| Écrans métier | Une grande partie dans `PrototypePages.tsx` (environ 1 780 lignes) | Plusieurs domaines sont fortement regroupés |
| Authentification | Supabase Auth dans `ifawa-auth.ts` | Inscription, connexion et session réelles dans le code |
| Données métier | Appels Supabase directs depuis `src/lib/ifawa-*.ts` | Les droits en base sont déterminants ; masquer un bouton ne protège pas les données |
| État | Store global `useSyncExternalStore`, stockage local et caches par utilisateur | Réactivité locale, mais isolation et synchronisation à fiabiliser |
| React Query | Client installé et fourni à l’application | Les principaux chargements métier utilisent encore des effets manuels |
| Contenus fixes | `src/data/mock.ts` | Signes, formules, rapports, administration et certains compteurs démonstratifs |
| Installation | Manifest et service worker minimal | Pas de stratégie hors connexion dans le service worker actuel |

La configuration locale pointe vers `ejaiflgcspbowtsywyqc.supabase.co`, comme le client de secours. Le SQL le désigne comme « Ifawa2 ». Le connecteur Supabase accessible ne donne pas accès à ce projet : la demande d’inventaire des tables a été refusée. L’autre projet intitulé « IfaWa » visible dans le connecteur a une référence différente ; il ne faut pas les confondre.

Le fichier SQL est un **contrat attendu**, pas la preuve du schéma effectivement déployé. Aucune migration, modification de données ou tentative d’exploitation n’a été effectuée.

## 3. Direction visuelle proposée

### Identité et couleurs

Conserver une identité africaine contemporaine, sobre et chaleureuse. Utiliser l’ivoire pour le fond, des cartes légèrement plus claires et une encre sombre pour le contenu. Réserver la terre cuite à l’action principale et aux états actifs. Garder le vert forêt pour quelques zones de marque. Le laiton doit rester un accent discret.

Les couleurs suivantes sont des conversions approximatives des tokens OKLCH actuels en sRGB :

| Rôle | Couleur actuelle approximative | Avis |
|---|---|---|
| Fond ivoire | `#F4EEE2` | Base cohérente à conserver |
| Carte | `#FBF7F0` | Bonne séparation subtile à contrôler à l’écran |
| Texte principal | `#211C16` | Contraste calculé élevé sur ivoire |
| Texte secondaire | `#3E372D` | Éviter de trop réduire son opacité |
| Terre cuite | `#BD5626` | À assombrir pour les petits textes et boutons |
| Laiton | `#A77E26` | Éviter comme petit texte sur ivoire ou vert |
| Vert forêt | `#2A4531` | À accompagner de texte clair |

Calculs sur les couleurs opaques déclarées, sans mesure des pixels rendus : ivoire/terre cuite ≈ **4,03:1**, terre cuite/carte ≈ **4,36:1**, laiton/ivoire ≈ **3,23:1**, laiton/forêt ≈ **2,82:1**. Ces associations n’atteignent pas 4,5:1 pour du texte courant. Les opacités et mélanges réellement affichés restent à vérifier. Le texte secondaire brun sur forêt descend à environ **1,12:1** ; cette combinaison est possible sur une formule sélectionnée non recommandée.

La référence WCAG exige généralement 4,5:1 pour du texte courant, 3:1 pour du grand texte : [W3C — contraste minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### Typographie

Actuellement : Anton pour les titres, Inter pour le corps, JetBrains Mono pour beaucoup de commandes et métadonnées. Le mélange est expressif, mais la multiplication des capitales et des très petites tailles convient mal à une application sociale consultée longtemps.

Proposition :

- Inter pour le contenu, les boutons, les formulaires et la navigation.
- Corps des publications et champs : viser 16 px, interligne confortable de 1,45 à 1,6.
- Actions : 14–16 px, graisse moyenne ; métadonnées : 12–13 px.
- Titres d’écran : 24–28 px, casse naturelle ; garder Anton pour le logo et quelques titres de marque.
- Réserver la police monospace aux références de dossiers, pas aux actions principales.
- Réduire l’espacement des lettres ; supprimer les commandes en 8,5–10 px.

### Mobile

Conserver les cinq onglets familiers : Accueil, Fa, Réseau, Messages, Profil. Ajouter un accès explicite aux services et aux outils personnels depuis le profil ou un menu identifié. Le bouton flottant « mallette » seul demande une interprétation et les liens latéraux disparaissent sur mobile.

Viser des zones tactiles de 44–48 px pour le confort ; il s’agit d’une cible de design, distincte du minimum WCAG 2.2 de 24 × 24 px avec exceptions et règles d’espacement : [W3C — taille des cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Prévoir explicitement la zone sûre inférieure du téléphone, la hauteur dynamique du viewport et l’ouverture du clavier dans les conversations. Le code actuel utilise une navigation fixe en bas et des hauteurs en `100vh`, sans traitement explicite de `safe-area-inset-bottom`.

Unifier les arrondis : plusieurs surfaces vertes et sombres restent rectangulaires, alors que les cartes claires et boutons sont arrondis. Dans le fil, laisser le contenu dominer ; identifier une publication officielle par un badge sobre plutôt que par une grande carte sombre.

### Cohérence éditoriale et confiance

- Uniformiser IFAWA / Ifawa et tutoiement / vouvoiement.
- Revoir « Découvre ton signe » : la bibliothèque et l’inscription ne constituent pas une détermination du signe. Une formulation comme « Le Fa, la connaissance et la communauté » décrit mieux le produit existant.
- Traduire les pages 404 et d’erreur actuellement en anglais.
- Afficher des états explicites : envoi en cours, envoyé, échec, réessayer, hors connexion.
- Remplacer les statistiques et prestations fictives par des données réelles ou des états vides honnêtes.
- Traiter les fenêtres de profil, d’image et les menus avec une vraie gestion du focus, une fermeture au clavier et des noms accessibles.
- Prévoir une variante qui réduit les animations.

## 4. Parcours et fonctionnalités

| Écran / domaine | Ce qui existe dans le code | Écart principal |
|---|---|---|
| Bienvenue | Deux parcours, présentation, installation | Accès connexion peu mis en avant ; promesse du titre à préciser |
| Inscription initié | 8 étapes, création Auth et profil | Trop de friction ; valeurs personnelles préremplies ; étapes sautables |
| Inscription découverte | 5 étapes | Centres d’intérêt non sauvegardés en base ; promesse de modifier son initiation non matérialisée dans les réglages |
| Connexion | Email et mot de passe | Pas de récupération de mot de passe ; risque d’écrasement de profil |
| Fil | Lecture, texte/photo, filtres, réactions, commentaires, partages | Erreurs silencieuses, chargement limité, aucune pagination de continuation |
| Menu d’une publication | Enregistrer, Masquer, Signaler | Ces trois commandes ferment seulement le menu |
| Bibliothèque | 16 fiches locales | Textes génériques, variantes explicitement fictives et compteurs fixes |
| Réseau | Invitations, acceptation/refus, suppression, suggestions | Filtrage local limité ; désactiver la mise en relation peut faire disparaître une connexion existante de la liste |
| Messages | Conversations et messages enregistrés par Supabase | Aucun abonnement temps réel ni rafraîchissement périodique observé ; historique chargé globalement |
| Profil | Couverture commune, avatar, publications | À propos, connexions, contributions et parcours rendent le même témoignage |
| Recherche | Signes, membres chargés, services | Pas de recherche de publications malgré le texte annoncé dans l’en-tête |
| Services | Catalogue distant avec secours local ; demandes enregistrées | Prix et formules locaux ; initiation réutilise les formules de consultation |
| Contributions | Soumission et lecture des contributions personnelles | « Signe concerné » enregistré comme titre, sans remplir `fa_sign_id` |
| Dossier | Liste des demandes personnelles | Pas d’ouverture d’un dossier détaillé avec documents et résultat |
| Carnet | Demandes et contributions réunies | Pas de tri chronologique global ; statuts de contribution bruts |
| Suivi | Affiche la dernière demande | Pas de sélection par dossier ; état annulé traité comme une analyse passée |
| Accompagnement | Présentation d’une formule 6 mois active | Affichage fixe sans vérifier une souscription réelle |
| Rapport | Comparaison et synthèse | Contenu de démonstration indépendant du résultat de la demande |
| Administration | Compteurs et listes | Données mock ; pas de contrôle de rôle métier dans cette page |
| Confidentialité | Pseudo, avatar, mise en relation | Le sélecteur de visibilité du signe n’a aucun branchement de sauvegarde |
| Notifications | Reconstruites depuis connexions, commentaires et messages | États lus surtout locaux ; pas de flux complet services/contributions |

### Monnaie et offres

Les prix sont des chaînes telles que `15 000 F`, `28 000 F`, `60 000 F` ou `135 000 F`, dans `mock.ts`. Aucune devise structurée, aucun paiement et aucune facturation n’ont été identifiés dans le code métier examiné.

Si la devise commerciale retenue est le franc CFA BCEAO, afficher **15 000 FCFA** et stocker explicitement le code **XOF**. Confirmer cette décision métier avant toute intégration de paiement. Pour une formule, présenter la durée, le montant total, ce qui est inclus et les délais. « Recommandé » et « Sélectionné » doivent être deux états distincts.

Les données de demande n’enregistrent actuellement que le nom de la formule et des détails libres. Pour un futur achat, prévoir un identifiant stable de formule, un prix et une devise fixés côté serveur, ainsi qu’un instantané de l’offre acceptée. Ce rapport ne valide ni le niveau des prix ni les prestataires de paiement.

## 5. Toutes les tables définies dans le dépôt

Le schéma local définit **13 tables métier**. `auth.users`, `storage.buckets` et `storage.objects` sont des tables système utilisées en complément.

| Table | Clé / relations | Usage et observation |
|---|---|---|
| `profiles` | `id` → `auth.users.id` | Identité publique, images, parcours et mise en relation ; un profil par compte |
| `fa_signs` | UUID ; `slug` unique | Référentiel minimal ; ne contient pas les textes complets de la bibliothèque |
| `profile_fa_details` | PK `profile_id` → `profiles` ; `fa_sign_id` → `fa_signs` | Relation 0..1 par profil ; année, satisfaction, expérience et visibilité |
| `posts` | `author_id` → `profiles` | `body` texte contenant en pratique du JSON : texte, type, média, partage |
| `post_comments` | `post_id` → `posts` ; `author_id` → `profiles` | Plusieurs commentaires par publication |
| `post_reactions` | PK (`post_id`, `profile_id`) | Une réaction par membre et publication ; quatre valeurs autorisées |
| `contributions` | `author_id` → `profiles` ; `fa_sign_id` → `fa_signs` | Soumission / approbation / rejet ; liaison au signe non renseignée par le formulaire actuel |
| `connections` | Demandeur et destinataire → `profiles` | États pending/accepted/rejected ; empêche l’auto-demande, pas la paire inverse B→A |
| `conversations` | `created_by` → `profiles` facultatif | Parent des messages et participations ; créateur souvent omis par le client |
| `conversation_members` | PK (`conversation_id`, `profile_id`) | Relation plusieurs-à-plusieurs ; date de dernière lecture |
| `messages` | Conversation → `conversations` ; expéditeur → `profiles` | Texte et date ; contrôle fondé sur la participation |
| `service_catalog` | UUID ; `type` unique | Catalogue actif et ordre d’affichage ; pas de prix/formules structurés |
| `service_requests` | Demandeur → `profiles` ; signe → `fa_signs` | Détails/résultats JSON ; `service_type` sans clé étrangère vers le catalogue |

Les dépendances sociales sont généralement supprimées en cascade avec leur parent. Les références de signes sont mises à NULL si un signe disparaît. Les buckets `profile-media` et `post-media` sont déclarés publics dans le SQL local.

Les notifications, le carnet et le dossier ne sont pas des tables dédiées ici : ce sont des vues construites côté client à partir d’autres données. Il n’y a pas de table métier locale pour les signalements, les blocages, les favoris, les rôles, les paiements, les abonnements, les documents privés ou le contenu éditorial versionné.

Le script n’initialise pas les 16 signes : il crée le référentiel et alimente uniquement le catalogue des quatre services. Il ne suffit donc pas, seul, à garantir les correspondances utilisées par l’inscription.

## 6. Corrections prioritaires

### Priorité critique si les règles locales sont déployées

1. **Confidentialité des conversations.** `conversation_members_select_member` autorise toute lecture et `conversation_members_insert_self_or_creator` tout ajout pour un utilisateur authentifié (`using (true)` / `with check (true)`, SQL lignes 342–351). Combinées aux politiques messages fondées sur l’appartenance, elles rendent possible un ajout non autorisé à une conversation. Vérifier immédiatement les politiques effectives ; restreindre les adhésions à un flux contrôlé.
2. **Informations Fa.** `profile_fa_select_authenticated` lit toutes les lignes sans consulter les colonnes de visibilité (SQL lignes 206–209). Les choix de confidentialité ne sont pas appliqués par cette règle. Définir précisément les champs visibles et les protéger côté données ; une seule règle par ligne peut être insuffisante pour des visibilités par champ.
3. **États métier manipulables.** L’insertion d’une contribution vérifie l’auteur mais pas l’état `submitted` ; une insertion directe pourrait demander `approved`. Les connexions peuvent être insérées avec un état accepté, et les demandes de services peuvent être modifiées par leur demandeur, y compris les champs de résultat/statut, sous réserve des privilèges de colonnes effectifs. Réserver les transitions métier à des opérations autorisées.

Ces risques sont établis sur le texte SQL ; ils ne constituent pas une affirmation d’incident ni une preuve de leur présence en production. Les privilèges et politiques réels doivent être inspectés. Référence : [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Priorité haute démontrée par le code

4. **Reconnexion destructive pour le profil.** `signInWithEmail` appelle `createOrUpdateProfile` depuis les métadonnées si aucun brouillon n’est disponible (`ifawa-auth.ts`, lignes 193–202). Ces métadonnées ne contiennent ni signe, ni année, ni satisfaction, ni témoignage. L’upsert écrit alors des valeurs NULL pour les détails d’un initié et remet la couverture à NULL. Séparer la connexion de la création initiale ; ne compléter que ce qui manque. À reproduire avec un compte de test autorisé.
5. **Fausse sauvegarde de confidentialité.** Le sélecteur « Visibilité du signe » est déconnecté de l’état et de `updateProfileSettings` (`PrototypePages.tsx`, vers 1408). Le choix n’est pas sauvegardé.
6. **Publication perdue sans avertissement.** Le fil ajoute immédiatement le post local puis vide le brouillon ; l’échec distant est absorbé (`accueil.tsx`). Au prochain chargement, la publication locale peut disparaître. Conserver le brouillon et un état d’échec avec reprise.
7. **État local non réinitialisé par compte.** `ifawa.app-state` est global ; `setCurrentUserId` change seulement l’identifiant et `signOut` ne purge pas ces données. Un changement de compte peut laisser des informations du profil précédent, surtout si le chargement échoue. Isoler/réinitialiser l’état et supprimer les caches privés selon la politique choisie.
8. **Crédibilité des actions.** Enregistrer / Masquer / Signaler ne font rien ; accompagnement et rapports présentent des informations fixes. Implémenter ces fonctions ou rendre leur indisponibilité explicite avant ouverture publique.
9. **Badge officiel non garanti.** Le rendu « Officiel » dépend du `type` contenu dans le JSON rédigé par le client. La règle locale sur les posts ne réserve pas ce type à une autorité. Dériver ce statut d’un rôle ou d’un auteur validé côté serveur.
10. **Données personnelles inventées par défaut.** L’inscription initié préremplit un signe et l’année 2018, avec la possibilité de passer l’étape. Un utilisateur peut enregistrer ces valeurs sans les avoir choisies. Utiliser « Non renseigné » et une sélection explicite.

### Robustesse et croissance

11. Le fil récupère les 80 derniers posts mais les **400 premiers commentaires globaux**, sans les limiter à ces posts. Les commentaires récents peuvent manquer même dans un fil récent ; les réactions sont aussi chargées globalement. Paginer et filtrer par les publications concernées.
12. Les messages de toutes les conversations sont chargés ensemble, par ancienneté, sans pagination explicite. Prévoir une liste avec dernier message et pagination indépendante du fil actif ; aucun temps réel client n’est branché actuellement.
13. `last_read_at` est mis à jour par le code, mais le script local ne crée aucune politique UPDATE de `conversation_members`. Le client masque l’erreur et s’appuie sur une date locale. Vérifier la synchronisation entre appareils.
14. Le filtrage réseau `relation_enabled !== false` retire également les connexions acceptées. Distinguer disponibilité pour de nouvelles demandes et relations déjà existantes.
15. Les marqueurs de comptes de test sont des sous-chaînes du pseudonyme. Ce filtrage peut cacher des membres légitimes ; isoler les tests dans un environnement prévu.
16. Le statut « La sauvegarde distante sera réessayée plus tard » est affiché sans file de reprise observée. Ajouter cette reprise ou dire explicitement que la sauvegarde a échoué.
17. `updated_at` possède un défaut initial mais aucun trigger de mise à jour n’est défini dans le script. Les notifications de connexions utilisent cette date ; contrôler sa fiabilité.
18. Aucun index secondaire dédié aux parcours de lecture n’est déclaré au-delà des clés primaires/uniques. Évaluer les requêtes et leurs plans avant d’ajouter des index ciblés.
19. Les chargements du Shell et des pages se recouvrent, et le Shell est répété par route. Centraliser les requêtes et leur invalidation pour éviter les chargements redondants.
20. Les URL inconnues de signe ou service retombent sur le premier élément au lieu d’un état introuvable. Un mauvais lien ne doit pas présenter un autre service comme s’il correspondait.

## 7. Fonctions à compléter ou ajouter

| Ordre | Proposition | Pourquoi |
|---|---|---|
| 1 | Confidentialité effective, blocage, signalement et modération | Conditions de confiance d’une communauté |
| 2 | Mot de passe oublié, confirmation email claire, récupération du compte | Éviter de perdre les utilisateurs dès l’accès |
| 3 | États d’envoi fiables, reprise et brouillons | Éviter les publications et messages perdus |
| 4 | Profils complets et modification du parcours Fa | Honorer les onglets et promesses existantes |
| 5 | Recherche de publications, pagination et favoris | Retrouver le contenu utile avec la croissance |
| 6 | Notifications persistantes et messages actualisés | Expérience sociale cohérente entre appareils |
| 7 | Dossier sélectionnable, résultats et documents privés | Fermer réellement le parcours de service |
| 8 | Bibliothèque éditoriale avec sources, relecteur, date et variantes documentées | Différenciation et crédibilité propres à IFAWA |
| 9 | Offres structurées, prix/devise, prestations et suivi | Préparer une monétisation claire et contrôlable |
| 10 | Contenus audio, langues utiles au public, mode réseau faible | Pistes adaptées au public, à confirmer par les usages |

Reporter les stories, vidéos courtes, directs, marketplace générale et gamification tant que les parcours essentiels ne sont pas fiables. Simplifier les doublons Dossier / Carnet / Suivi dans un espace personnel avec une hiérarchie claire. Garder l’administration dans un espace réservé aux rôles autorisés.

## 8. Contrôles exécutés

| Contrôle | Résultat | Interprétation |
|---|---|---|
| `npm run dev -- --host 127.0.0.1` | Vite prêt sur le port 8080 après escalade autorisée | Le premier essai était bloqué par `spawn EPERM` dans le bac à sable ; aucun rendu navigateur validé |
| `npx --no-install tsc --noEmit` | Échec, code de sortie 1 | Incompatibilités de propriétés optionnelles avec `exactOptionalPropertyTypes`, types réseau/conversations, accès aux variables d’environnement et liens de routes typés ; plusieurs fichiers concernés |
| `npm run lint -- --quiet` | Échec, 5 050 erreurs, toutes annoncées potentiellement corrigeables automatiquement | Sortie dominée par Prettier, notamment les fins de ligne CRLF ; ne pas assimiler ce total à 5 050 bugs fonctionnels |
| Contrastes des tokens | Calculs effectués depuis OKLCH vers sRGB linéaire et luminance relative | Plusieurs combinaisons sous 4,5:1 ; ne remplace pas une mesure du rendu avec opacités |
| Inventaire Supabase réel | Accès refusé à la référence du projet | Aucun résultat sur les tables et règles déployées |
| Chrome / navigateur intégré | Erreurs de connexion de l’outil avant inventaire | Aucune capture ni validation mobile réalisée |
| État du dépôt | Seul ce rapport est ajouté par l’audit | La suppression de `public/favicon.ico` était déjà présente au début et n’a pas été modifiée |

La compilation de production, les mesures de performance et les tests de parcours réels restent non exécutés. Aucun formatage automatique ni correction de code n’a été lancé.

## 9. Validation restante et ordre de réalisation

1. **Accès navigateur :** rétablir le connecteur Chrome, identifier l’URL ouverte et la session, sans déconnexion ni action sociale pendant l’audit.
2. **Audit visuel réel :** examiner à 360, 390 et 430 px puis sur ordinateur ; captures des pages principales, menus, champs, erreurs et états vides. Contrôler débordements, clavier, cibles, contrastes rendus, focus et navigation retour. Aucune de ces vérifications n’est encore faite.
3. **Base Ifawa2 :** inventorier les tables, colonnes, contraintes, politiques, fonctions, triggers, buckets, migrations et advisors de la référence correcte. Comparer au SQL local ; n’afficher aucune donnée privée dans le rapport.
4. **Comptes de test autorisés :** vérifier reconnexion sans perte, isolation de deux comptes, confidentialité, refus d’accès entre conversations, persistance après rechargement et échecs réseau.
5. **Fiabilisation :** corriger les autorisations, la reconnexion, les paramètres et les faux succès avant de connecter des prestations réelles.
6. **Design :** appliquer une première passe sur fil + navigation mobile + profil, puis décliner aux autres parcours avec les mêmes composants.
7. **Fonctions :** compléter les parcours existants avant d’étendre le périmètre social.

Le README doit ensuite être mis à jour : son instruction de prototype entièrement simulé ne décrit plus le code actuel. Aucun code applicatif, aucune donnée distante et aucun historique Git n’ont été modifiés par cet audit.
