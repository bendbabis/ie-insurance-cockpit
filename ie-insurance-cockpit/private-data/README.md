# private-data — données nominatives, hors dépôt

- `team-data.js` : base d'équipe chargée automatiquement au premier lancement (profils, compétences, LoB, staffing, pipeline, clients). Regénérable depuis l'application : **Données → Générer team-data.js**.
- `ie-insurance-team.json` : même contenu au format JSON, importable via **Données → Importer un JSON** ou poussable dans un dépôt privé (synchronisation GitHub).

Ce dossier est ignoré par git (`.gitignore`). Ne le publiez jamais dans un dépôt ou un site public.
