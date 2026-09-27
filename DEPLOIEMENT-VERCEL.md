# Production IFAWA — 16 septembre 2026

- URL publique : https://ifawa-your-fa-ecosystem.vercel.app
- Déploiement : `dpl_cKN3cjCjLKZqt7duLoUWkdznRf3L`
- Projet : `ifawa-your-fa-ecosystem`, équipe `amedeamours-projects`.
- État confirmé par Vercel CLI : READY, cible production.
- Sources : dossier de travail local actuel, sans création de commit ni push Git.
- Compilation distante : TanStack Start, Nitro/Vercel, fonction Node.js 24 ; build terminé en 9 secondes.

`vite.config.ts` sélectionne le preset Vercel lorsque `VERCEL` est présent. Le fonctionnement de Lovable reste conservé. `.vercelignore` exclut les fichiers d’environnement et les documents de travail de l’envoi.

Le correctif Supabase `persist_user_read_receipts` est appliqué à Ifawa2. Lecture/écriture propriétaire, isolation entre comptes et monotonie des dates ont été vérifiées sous le rôle authenticated dans une transaction annulée. Un marqueur réel de conversation a été synchronisé par l’application.

Contrôles en production : réponses HTTP 200 pour l’accueil, la connexion, le symbole/favicon et le manifeste ; titre IFAWA et ressources statiques contrôlés. Aucun journal d’erreur retourné pour ce déploiement lors de la vérification. Le navigateur intégré a rencontré des blocages de navigation/capture : aucune validation visuelle complète en production ni connexion utilisateur sur un second appareil n’est revendiquée.

Les corrections applicatives avaient passé 13 tests, TypeScript, ESLint et la compilation locale avant publication. La compilation distante a également réussi.

## Version 7 — 23 septembre 2026

Publication du dossier de travail actuel sur le même projet Vercel, métadonnée release=v7.

- URL publique : https://ifawa-your-fa-ecosystem.vercel.app
- Déploiement : dpl_BuKwzYLCkJ8GDksT2o7LcQ6Yetsm
- URL immuable : https://ifawa-your-fa-ecosystem-fh8k4q8kk-amedeamours-projects.vercel.app
- Vercel CLI : READY, target production ; alias public affecté.
- Build Vercel terminé avec succès en 9 secondes.
- Changements : accueil épuré, compte en dernière étape du parcours initié, informations obligatoires, satisfaction à sélectionner, saisie libre du signe avec suggestions et persistance Supabase.
- Migration add_profile_custom_sign_name appliquée ; contrôle de lecture/écriture dans une transaction annulée.
- Vérifications avant publication : TypeScript, lint ciblé, 19 tests et parcours local dans le navigateur.
Contrôles après publication : accueil et parcours initié HTTP 200 ; bloc installation absent ; champ de signe libre et liste de suggestions présents dans le HTML servi en production. Le navigateur intégré a expiré pendant le contrôle distant ; validation interactive réalisée en local. Compilation Vercel réussie ; compilation locale redondante interrompue après publication.
