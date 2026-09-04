# Assistant Enseignant IA

Application web pour aider les enseignants (primaire, collège, lycée) en Afrique francophone à préparer leurs cours : génération de fiches de préparation par IA, bibliothèque personnelle, export PDF.

## Stack

- **Frontend** : React + Vite, CSS simple (pas de framework CSS lourd)
- **Auth + Base de données** : Supabase (Postgres + Auth), sécurisé par Row Level Security
- **IA** : OpenAI `gpt-4o-mini`, appelée uniquement depuis une fonction serverless Netlify (la clé API n'est jamais exposée au navigateur)
- **Hébergement** : Netlify (site statique + fonctions serverless)
- **Hors-ligne** : cache basique (PWA) — l'application et les fiches déjà consultées restent lisibles sans connexion ; la génération IA nécessite le réseau

## Mise en route

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL du projet, exécuter le contenu de [`supabase/schema.sql`](supabase/schema.sql)
3. Récupérer, dans **Project Settings → API** : l'URL du projet et la clé `anon public`

### 2. OpenAI

1. Créer une clé API sur [platform.openai.com](https://platform.openai.com)

### 3. Variables d'environnement locales

Copier `.env.example` en `.env` et renseigner les valeurs :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### 4. Installation et développement local

```bash
npm install
```

Pour tester uniquement l'interface (sans les fonctions serverless) :

```bash
npm run dev
```

Pour tester avec la génération IA en local, il faut la [Netlify CLI](https://docs.netlify.com/cli/get-started/) (elle sert le site **et** les fonctions ensemble) :

```bash
npm install -g netlify-cli
netlify dev
```

### 5. Déploiement sur Netlify

1. Pousser ce projet sur GitHub (ou glisser-déposer le dossier dans Netlify)
2. Créer un nouveau site Netlify à partir du dépôt (`netlify.toml` configure déjà la commande de build et les redirections)
3. Dans **Site settings → Environment variables**, renseigner : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
4. Déclencher un déploiement

## Structure du projet

```
assistant-enseignant-ia/
├── netlify.toml                  # Build, redirections /api -> fonctions
├── package.json
├── vite.config.js                # Config Vite + PWA (cache basique)
├── index.html
├── .env.example
├── supabase/
│   └── schema.sql                # Tables profiles + fiches_cours, RLS
├── netlify/functions/
│   └── generate-fiche.js         # Appel sécurisé à OpenAI (gpt-4o-mini)
├── public/
│   └── icon.svg
└── src/
    ├── main.jsx
    ├── App.jsx                   # Routes
    ├── supabaseClient.js
    ├── styles/global.css
    ├── context/AuthContext.jsx   # Session + connexion/inscription/déconnexion
    ├── components/
    │   ├── Navbar.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── FicheCard.jsx
    │   └── LoadingSpinner.jsx
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── SignupPage.jsx
    │   ├── ProfilPage.jsx        # Nom / école affichés sur le PDF
    │   ├── DashboardPage.jsx     # Bibliothèque, filtres, recherche
    │   ├── NouvelleFichePage.jsx # Formulaire + génération IA
    │   └── FicheDetailPage.jsx   # Édition + export PDF + suppression
    └── lib/
        ├── fichesApi.js          # CRUD Supabase + cache localStorage
        └── pdfExport.js          # Génération du PDF avec jsPDF
```

## Fonctionnalités du MVP

- Inscription / connexion enseignant
- Génération de fiche de cours par IA (objectifs, déroulé, matériel, évaluation) à partir du cycle, de la classe, de la matière et du thème
- Sauvegarde automatique dans une bibliothèque personnelle
- Recherche et filtres par matière / cycle
- Modification manuelle du contenu généré (objectifs, étapes du déroulé, matériel, évaluation)
- Export PDF imprimable, avec en-tête personnalisable (nom / école dans "Mon profil")
- Consultation hors-ligne des fiches déjà chargées

**Hors périmètre pour l'instant** (à ajouter dans une prochaine itération) : exercices/devoirs avec corrigés, cahier de textes numérique, fiches d'évaluation/examens avec barème, emploi du temps, paiement, notes/bulletins, communication avec les parents.
