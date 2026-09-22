# E-mails des questionnaires « Votre projet »

À chaque questionnaire terminé, la fonction `functions/submission-created.js` envoie :

1. à Nova Studio : « Nouveau client · Métier · Activité (Nom) » (questionnaires) ou « Nouveau client · Question rapide · e-mail » (formulaire de l'accueil), avec les coordonnées puis toutes les réponses ;
2. au client : un accusé de réception personnalisé, avec le récapitulatif de ses réponses.

Contenu des e-mails : `lib/mail-templates.js`. Objet fixe côté Nova Studio : commence toujours par « Nouveau client ·
» (pratique pour une recherche ou un résumé automatique de la boîte mail).

## Mise en route (une seule fois, après la mise en ligne sur Netlify)
1. Compte Google de Nova Studio → Sécurité → activer la validation en deux étapes → « Mots de passe des applications »
   → en créer un (nom : « Site Nova Studio »). Copier les 16 caractères.
2. Netlify → Site configuration → Environment variables, ajouter :
   - `SMTP_USER` = NovaStudio.fra@gmail.com
   - `SMTP_PASS` = le mot de passe d'application (jamais dans le code, jamais dans un e-mail)
   - `MAIL_TO` (facultatif) = l'adresse qui reçoit les nouveaux clients (par défaut : SMTP_USER)
3. Redéployer le site, puis faire un test avec sa propre adresse.

Sans ces variables, la fonction ne fait rien ; Netlify Forms enregistre quand même les envois (Forms → Notifications
permet d'activer sa notification standard en secours).

## Notes
- Gmail limite l'envoi à environ 500 e-mails par jour : largement suffisant ici.
- Pour changer de messagerie plus tard (Brevo, Resend…), modifier `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`.
- `MAIL_DRY_RUN=1` : n'envoie rien, affiche les e-mails dans les journaux de la fonction (pour tester).
- Ce dossier n'est pas publié : voir `netlify.toml`.
