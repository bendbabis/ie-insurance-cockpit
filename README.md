# I&E Insurance — Capability Cockpit

Outil de pilotage de la capability actuarielle et analytics d'une practice de conseil : skills matrix, profils consultants, couverture et risques de delivery, matching RFP, génération de CV et de credentials — avec des **agents LLM configurables** (Anthropic, OpenAI, DeepSeek, Gemini, Mistral, serveur compatible OpenAI).

Site statique (HTML, CSS, JavaScript, sans build) : fonctionne en local (double-clic sur `index.html`) et sur GitHub Pages.

## Démarrage rapide

1. Ouvrir `index.html` dans un navigateur récent (Chrome, Edge, Firefox).
2. **Données** → *Jeu de démonstration* (8 profils fictifs) ou *Importer un JSON* (`private-data/ie-insurance-team.json` pour les données réelles de l'équipe).
3. **Agents & clés API** → choisir un fournisseur, coller une clé, *Tester la connexion*, *Lister les modèles*, *Enregistrer*.
4. **Import de CV** → déposer des CV PPTX / DOCX / PDF : l'agent extrait le profil et les niveaux, vous validez la fusion.

Les données sont sauvegardées automatiquement dans le navigateur (localStorage) et exportables en JSON à tout moment.

## Déploiement sur GitHub Pages

```bash
git init && git add . && git commit -m "I&E Insurance Capability Cockpit"
git remote add origin https://github.com/<compte>/ie-insurance-cockpit.git
git push -u origin main
```

Puis dans le dépôt : **Settings → Pages → Source : GitHub Actions**. Le workflow `.github/workflows/pages.yml` publie le site à chaque push sur `main`. L'URL sera `https://<compte>.github.io/ie-insurance-cockpit/`.

### ⚠️ Données personnelles et confidentialité

Un site GitHub Pages est **public** (sauf GitHub Enterprise Cloud avec Pages privées). Le dépôt et le site ne doivent donc **jamais** contenir les profils nominatifs de l'équipe :

- `private-data/` est exclu par `.gitignore` ; conservez-y `ie-insurance-team.json` en local.
- Les données réelles se chargent **dans le navigateur** (import JSON) et y restent (localStorage). Chaque utilisateur importe le fichier ou le synchronise depuis un **dépôt privé** (voir ci-dessous).
- Alternative : héberger l'application elle-même dans un dépôt privé et l'ouvrir en local ou sur un hébergement interne.

### Synchronisation GitHub (optionnelle)

L'application peut lire et écrire un fichier JSON dans un dépôt GitHub via l'API Contents, avec un token personnel :

- Créer un **dépôt privé** de données (ex. `ie-insurance-cockpit-data`).
- Créer un token *fine-grained* limité à ce dépôt, permission **Contents : Read and write**.
- **Agents & clés API → Synchronisation GitHub** : token, propriétaire, dépôt, branche, chemin (`data/team.json`), puis *Enregistrer sur GitHub* / *Charger depuis GitHub*.

Le token est stocké dans le navigateur uniquement. L'historique git du dépôt privé sert de journal des versions de la base.

## Identité visuelle

L'interface et les exports reprennent la charte Accenture : noir, blanc, Core Purple `#A100FF`, Dark Purple `#7500C0`, `#460073`, typographie Graphik lorsqu'elle est installée sur le poste (sinon Inter, puis la police système). **Aucun logo propriétaire n'est embarqué** : chargez le logo officiel dans **Agents & clés API → Identité visuelle** (stocké dans le navigateur, repris dans la barre latérale et sur les PowerPoint), ou déposez `assets/img/logo.svg` et `assets/img/logo.png` dans le dépôt pour toute l'équipe. Le nom de la practice (« I&E Insurance » par défaut) est modifiable au même endroit et alimente titres, pieds de page et exports.

## Agents et clés API

| Agent | Rôle | Sans clé API |
|---|---|---|
| `cvParser` | CV → profil structuré : bio, expériences, outils, formation, niveaux 0-5 justifiés sur la taxonomie, compétences hors taxonomie proposées | analyse locale par mots-clés (regex de la taxonomie) |
| `matrixAdvisor` | Propose ajouts, fusions, renommages, criticités et incohérences de niveaux | — |
| `rfpAnalyst` + `rfpRerank` | RFP → besoin structuré (compétences, importance, niveau min, grades, langues, calendrier) puis composition d'équipe justifiée | matching local par mots-clés et score pondéré |
| `cvWriter` | CV au format cabinet (FR/EN), ciblable sur un RFP, clients anonymisables | version dérivée du profil |
| `credentialWriter` | Expériences → références commerciales (contexte, enjeu, approche, livrables, résultats) | — |

Fonctionnement : la clé est stockée dans le `localStorage` du navigateur, jamais dans le code ni dans le dépôt. Les appels partent directement du navigateur vers l'API du fournisseur (Anthropic autorise ces appels avec l'en-tête `anthropic-dangerous-direct-browser-access` ; OpenAI, Gemini et Mistral acceptent les requêtes navigateur avec une clé). Seul le **texte extrait** des documents est envoyé, jamais le fichier.

Recommandations :
- ne pas configurer de clé sur un poste partagé ; le bouton *Effacer la clé* la supprime ;
- utiliser des clés à budget plafonné, dédiées à cet usage ;
- vérifier la conformité du fournisseur avec la politique de données de l'entreprise avant d'envoyer des CV ;
- les noms de modèles évoluent : utilisez *Lister les modèles* plutôt que les valeurs proposées par défaut.

Si un fournisseur refuse les appels navigateur (erreur CORS, cas fréquent avec DeepSeek), déployez le proxy `docs/cors-proxy-worker.js` (Cloudflare Worker gratuit) et renseignez son URL dans *URL de base*. Le champ *URL de base* accepte aussi un serveur local compatible OpenAI (Ollama, LM Studio, vLLM) avec le fournisseur « Compatible OpenAI ».

Les prompts des agents sont modifiables dans **Agents & clés API → Prompts** ; un prompt vide revient au défaut.

## Fonctionnalités

- **Business — Synthèse & prévisions** (vue MD) : chiffre d'affaires prévisionnel sur 12 mois (sécurisé = affectations × TJ × jours ouvrés, extensions pondérées, pipeline pondéré, total exercice), capacité vs demande en FTE avec écart demande − capacité (signal de recrutement ou de bench), chargeabilité mensuelle réalisée / prévue, par grade, comptes en cours, paramètres (jours facturables, exercice, cible, TJ moyen, fermetures).
- **Business — Chargeabilité** : grille consultant × quinzaine (1-15 et 16-fin de mois). Heures disponibles calculées automatiquement (8 h × jours ouvrés hors week-ends et fériés français, fixes et mobiles), heures chargeables et d'absence saisies, taux = chargeable ÷ (disponible − absence) ; en l'absence de saisie, prévision issue du backlog : taux de staffing × heures nettes tant que la mission court (~), puis taux × probabilité d'extension pendant la durée d'extension du projet (≈) ; heures disponibles proratisées aux dates d'arrivée et de départ. Client, mission, WBS et fin de mission affichés depuis le backlog. Le taux d'équipe est toujours la somme des heures chargeables divisée par (somme des heures disponibles − somme des absences), jamais une moyenne de taux, et il se recalcule dynamiquement selon le périmètre : filtres (grade, recherche, leavers masqués), fenêtre de quinzaines affichée, et cases cochées devant les consultants pour restreindre le calcul à une sélection (indicateurs, quinzaine en cours, cumul d'exercice et pied de tableau suivent). Navigation par mois, « figer le prévisionnel », export et import Excel de la feuille de saisie.
- **Business — Backlog de projets** : une fiche par mission (type, description, client maître, entité, WBS, LoB, début, fin, probabilité et durée d'extension, budget), consultants affectés (ajout / retrait, taux de staffing propre à chacun), calendrier Gantt sur 12 mois avec extension pondérée. Le projet est la référence : il alimente automatiquement les affectations des consultants (disponibilité, triage, chargeabilité prévisionnelle). Reconstruction possible depuis les affectations individuelles.
- **Business — Pipeline** : même structure que l'onglet Pipe (Opportunity ID, Master Client Name, Master Client Name 2, Opportunity Name, Description, Start date, Duration, End Date, Total Revenue K€, Prob) plus statut ; entonnoir par statut, par trimestre de démarrage, par client ; « Équipe » lance le RFP Matching, « → Projet » bascule une affaire gagnée dans le backlog.
- **Import / export Excel** : `Input_Business_Steering.xlsx` avec les onglets Client_List, Team, Pipe, Backlog (par consultant, regroupé en projets par WBS ou client + mission), et en option Backlog_Projets (niveau mission) et Chargeabilite (saisies par quinzaine) ; le modèle rempli se télécharge pour édition puis ré-import.

- **Dashboard** : effectif, leaders, expertises, disponibilités, courbe de libération de capacité par triage, couverture par domaine, compétences critiques sous-couvertes.
- **Coverage & Gaps** : profondeur par compétence, rareté, key person risks, actions de développement (appétences déclarées).
- **Delivery Risk & Bench** : triage rouge / orange / vert, fins de mission, bench, pistes.
- **Skills Matrix** — deux dimensions :
  - **Cartographie chaîne de valeur × lignes de business** (vue par défaut) : 12 étapes de la chaîne de valeur assurance (stratégie & offre, distribution, marketing & CX, tarification & souscription, contrats & opérations, sinistres & prestations, actuariat & finance, risque & capital, investissements & ALM, plus trois étapes transverses : data & tech, transformation, leadership) croisées avec 9 lignes de business (vie & épargne, retraite, santé, prévoyance, emprunteur, IARD particuliers, IARD entreprises & spécialités, réassurance, assistance & affinitaire). Chaque cellule compte les profils qui ont au moins une compétence ≥ Advanced sur l'étape **et** une expérience ≥ Expérimenté sur la LoB ; un clic ouvre la liste des profils pour les retenir. Seuils, séniorité et disponibilité filtrables ; lecture leadership générée automatiquement.
  - **Détail par compétence** : heatmap 0-5 par consultant, colonnes groupées par étape, filtres par étape, LoB, catégorie, séniorité, disponibilité ; **mode édition** (niveau, appétence, dernier usage, preuve, validation people lead).
  - **Gestion de la taxonomie** : compétences (nom, étape, catégorie, mots-clés de détection, criticité), étapes de la chaîne de valeur et lignes de business ; **conseiller IA**.
- **Profils** : fiches éditables (bio, grade, disponibilité, staffing, expériences, **expérience par ligne de business 0-3**), filtres par étape et LoB, suppression, ajout par CV. **Arrivées et départs** : « + Consultant » crée un nouvel arrivant avec sa date d'arrivée (il entre dans l'effectif, la chargeabilité et le staffing à cette date) ; « Marquer leaver » enregistre une date de départ (le consultant sort de l'effectif à cette date, ses heures disponibles sont proratisées jusque-là, sa ligne est signalée dans la chargeabilité et peut être masquée). L'onglet Team du classeur fait la même chose en masse (colonnes Date of arrival, Leaver Y/N, Date of leave) et crée les consultants inconnus.
- **Import de CV** : lecture locale PPTX / DOCX / PDF / TXT, analyse par l'agent ou locale, fusion *Enrichir* / *Remplacer* / *Créer* ; les niveaux validés par un people lead ne sont jamais écrasés.
- **RFP Matching** : texte ou fichier, besoin structuré (compétences, étapes, lignes de business, grades, langues, calendrier), score pondéré (compétences 40, étape 10, LoB 10, séniorité 15, disponibilité 10, langues 10, expérience 5) avec explications et gaps, équipe proposée par l'agent, sélection puis CV ciblés.
- **Générateur de CV** : formats *cabinet* (complet, FR/EN, annexe historique), *exécutif*, *proposition*, *staffing* ; rédaction par l'agent ; export PPTX (palette violette, police Arial, zone logo réservée — aucun logo propriétaire embarqué), Excel, texte.
- **Credentials** : génération depuis les expériences, édition en ligne, statut brouillon / validée, filtres, export PPTX et Excel.
- **Exports** : classeur Excel multi-onglets (profils, cartographie chaîne de valeur × LoB, lignes de business, matrice, couverture, gaps, staffing, credentials, calibration, matching), deck PowerPoint leadership (dont la cartographie), classeur de calibration par people lead et ré-import.
- **Mode présentation** (⛶) : navigation ← → , Échap pour quitter.

## Structure du projet

```
index.html                 structure des vues
assets/css/app.css         design system (noir / blanc / Core Purple, palette Accenture)
assets/img/                emplacement du logo officiel (logo.svg / logo.png, non fournis)
assets/js/00-core.js       helpers, état, calculs de couverture
assets/js/10-store.js      persistance localStorage, import/export JSON, GitHub
assets/js/20-llm.js        adaptateurs fournisseurs LLM
assets/js/25-parsers.js    extraction de texte PPTX / DOCX / PDF
assets/js/30-agents.js     prompts et orchestration des agents
assets/js/40-views.js      dashboard, coverage, risk, matrice (+ édition, taxonomie), profils
assets/js/42-views-agents.js import CV, RFP, credentials, configuration, données
assets/js/45-drawer.js     fiche profil éditable
assets/js/50-search.js     moteur de matching local
assets/js/55-minicv.js     générateur de CV (vue)
assets/js/60-cvgen.js      PPTX format cabinet et credentials
assets/js/70-exports.js    Excel, deck leadership, calibration
assets/js/90-app.js        navigation, sélection, initialisation
data/taxonomy.js           taxonomie v2 : 12 étapes de chaîne de valeur, 9 lignes de business, 5 catégories, 83 compétences
data/demo-data.js          11 profils fictifs de démonstration (actuariat, sinistres, distribution, core systems)
assets/js/35-business.js   indicateurs business, prévisions CA / capacité, import/export Excel
assets/js/36-charge.js     calendrier (quinzaines, fériés) et chargeabilité
assets/js/37-projects.js   backlog de projets et synchronisation avec les consultants
assets/js/44-views-business.js vues Synthèse, Chargeabilité, Backlog, Pipeline
private-data/team-data.js  base d'équipe chargée au démarrage (ignoré par git)
private-data/ie-insurance-team.json même base au format JSON importable
docs/cors-proxy-worker.js  proxy CORS optionnel
```

Bibliothèques chargées depuis un CDN (avec fallback en cas d'indisponibilité) : SheetJS 0.18.5 (Excel), PptxGenJS 3.12.0 (PowerPoint), JSZip 3.10.1 (PPTX/DOCX), pdf.js 3.11 (PDF). Sans réseau, l'application fonctionne mais les exports Office et la lecture des documents Office/PDF sont indisponibles.

## Modèle de données

```json
{
  "taxonomy": { "version": 2, "categories": [], "domains": [ { "id": "actuariat_finance", "name": "Actuariat, finance & reporting", "short": "Actuariat & finance", "transverse": false } ],
                "lobs": [ { "id": "vie_epargne", "name": "Vie & Épargne", "short": "Vie", "kw": "épargne|assurance.vie" } ],
                "skills": [ { "id": "ifrs17", "name": "IFRS 17", "cat": "actuariel", "dom": "actuariat_finance", "critical": true, "kw": "ifrs ?17|csm|vfa" } ] },
  "people": [ {
    "id": "p_prenom_nom", "displayName": "…", "grade": "Manager", "role": "…", "headline": "…", "shortBio": "…", "yearsExperience": 9,
    "languages": ["Français","Anglais"], "availability": { "status": "staffed|partial|available|leaver", "from": "2026-12-31", "note": "" },
    "staffing": { "userId": "prenom.nom", "dailyRate": 1200, "masterClient": "", "client": "", "mission": "", "rate": 1, "dateFin": "2026-12-31", "wbs": "", "probaRenouv": 0.5, "durationMonths": 6, "budgetK": 150, "lob": "", "peopleLead": "", "triage": "Rouge|Orange|Vert", "semainesRestantes": 12, "pisteActive": "", "commentaire": "" },
    "skills": { "ifrs17": [4, 1, 2026, 1, 0] }, "lobs": { "vie_epargne": [3, 2026, 1] },
    "skillEvidence": { "ifrs17": "justification" }, "capabilities": { "sell": [], "deliver": [], "manage": [] },
    "keyStrengths": [], "selectedProjects": [ { "projectName": "", "clientType": "", "insuranceLine": "", "domain": "", "role": "", "duration": "", "impact": "", "technologies": [], "responsibilities": [] } ],
    "education": [], "certifications": [], "tools": [], "industries": [], "cvText": "texte du CV importé", "cvContent": { "fr": {} }, "source": { "kind": "cv", "file": "", "agent": "" }, "lastUpdated": "2026-09-29"
  } ],
  "pipeline": [ { "id": "", "oppId": "12109458", "masterClient": "", "client": "", "name": "", "description": "", "start": "2026-10-01", "months": 3, "end": "2026-12-30", "revenueK": 500, "prob": 0.3, "status": "Qualifiée", "lob": "", "owner": "" } ],
  "clients": ["…"], "biz": { "workdays": 19, "fyStartMonth": 9, "target": 0.8, "blendedRate": 1200 },
  "credentials": [ { "id": "", "title": "", "client": "", "clientAnonymized": "", "lob": "", "period": "", "context": "", "challenge": "", "approach": "", "deliverables": [], "results": [], "domains": [], "skills": [], "personIds": [], "confidence": "high", "status": "draft|validated" } ]
}
```

Le tableau `skills[id]` se lit : `[niveau 0-5, appétence 0-2, dernier usage (année), expérience prouvée 0/1, validé par le people lead 0/1]` ; `lobs[id]` : `[expérience 0-3 (exposé, expérimenté, référent), dernier usage, prouvé 0/1]`.

Un JSON exporté par la version précédente (taxonomie actuarielle v1) est migré automatiquement à l'import : les compétences « ligne de business » deviennent des expériences LoB, les compétences sont rattachées aux étapes de la chaîne de valeur, les identifiants inconnus sont ignorés.

## Limites et évolutions possibles

- Pas de backend : pas de multi-utilisateur simultané ni de droits d'accès ; la synchronisation GitHub est un partage par fichier (dernier écrit gagne). Un backend léger (Supabase, Azure Static Web Apps + Functions, Cloudflare Workers + D1) apporterait authentification, base partagée et journal d'audit.
- Les appels LLM directs exposent la clé dans le navigateur de chaque utilisateur ; en déploiement d'équipe, préférer un proxy qui détient la clé et authentifie les utilisateurs (SSO).
- Les niveaux estimés par l'agent restent des estimations : le circuit de calibration par les people leads (classeur Excel) et le marquage « validé » sont conçus pour les fiabiliser progressivement.
- Le format cabinet des CV est reproduit avec la palette Accenture et Arial ; le logo est celui que vous fournissez ; un gabarit `.potx` officiel peut être branché dans `60-cvgen.js` si fourni.
