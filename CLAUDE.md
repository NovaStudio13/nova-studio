# Nova Studio — consignes

## Où ranger les fichiers

- Ce dépôt contient **uniquement le site Nova Studio**.
- Tout le reste (concepts de sites clients, démos, sites fictifs, travail en cours) se fait dans **Projet S.I.**,
  pas dans ce dépôt. Projet S.I. est un dossier sur l'ordinateur de l'utilisateur, hors de ce dépôt.
- Un concept n'entre dans `concepts/` que lorsqu'il est publié sur le site : c'est alors une **copie**
  synchronisée depuis Projet S.I. par `Projet S.I./sync-novastudio.py` (cas de `concepts/comptoir-may/`).
  Ne jamais créer ni modifier directement un concept dans `concepts/` : la source est dans Projet S.I.
- Si Projet S.I. n'est pas accessible dans la session (session cloud), le dire et demander où travailler
  avant de créer quoi que ce soit.

## Session cloud : toujours livrer une copie

L'utilisateur travaille avec des dossiers sur son Mac et n'utilise pas GitHub. Une session cloud ne peut pas
écrire directement sur son Mac, mais ses dossiers « Projet S.I. » et « Mon site » sont synchronisés avec son
Google Drive (appli Google Drive pour ordinateur) : ce qui est écrit dans ces dossiers via le connecteur Drive
revient sur le Mac.

- Dossier Drive « Projet S.I. » : id `1DXmSvQ2GBS4CHNzY2HFgdnCc-5fiYqOJ` (contient son propre `CLAUDE.md`, à lire
  avant de travailler sur un projet : un sous-dossier par projet, sites qui s'ouvrent en double-cliquant `index.html`).
- Dossier Drive « Claude – copies » : id `1UzOGzBXULpGNYLv6HWbkAMiimLPsd6bi`.

À chaque livraison (et avant de terminer la session) :

1. Travailler dans l'espace temporaire de la session, tester (captures, parcours), puis déposer chaque fichier
   directement dans le bon sous-dossier de Projet S.I. sur Drive (`create_file` avec `disableConversionToGoogleType`),
   et vérifier que la taille renvoyée par Drive est égale à celle du fichier local.
2. Envoyer aussi un `.zip` de ce qui a été créé ou modifié dans la conversation (fichier joint).
3. Si Projet S.I. n'est pas accessible via Drive : déposer le `.zip` dans « Claude – copies » et dire où le ranger.
4. Ne jamais supposer qu'il sait utiliser git : expliquer en termes de fichiers et de dossiers.

## Les propositions de Milan sont des pistes, pas des ordres
Quand Milan propose une solution (« fais un message d'erreur », « mets tel texte »…), c'est une idée de départ :
- Chercher le vrai problème derrière la demande, et proposer mieux quand c'est justifié, en expliquant pourquoi.
- Corriger franchement une idée bancale, compléter ce qui manque.
- Un choix de goût précis (texte exact, couleur, ordre des éléments) s'applique tel quel ; proposer une alternative
  seulement si elle est nettement meilleure, sans l'imposer.
