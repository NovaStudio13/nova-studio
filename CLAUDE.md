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
écrire sur son Mac, donc à chaque livraison (et avant de terminer la session) :

1. Compresser en `.zip` tout ce qui a été créé ou modifié, rangé comme dans ses dossiers
   (ex. `salon-nacre/…` pour un concept de Projet S.I., `nova-studio/…` pour le site).
2. L'envoyer dans la conversation (fichier joint), avec une phrase disant où le ranger sur le Mac.
3. Déposer aussi le même `.zip` dans son Google Drive, dossier `Claude – copies` (accord donné le 24/09/2026).
   Il a l'appli Google Drive sur son Mac : le fichier y apparaît sans rien faire.
4. Ne jamais supposer qu'il sait utiliser git : expliquer en termes de fichiers et de dossiers.
