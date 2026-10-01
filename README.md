# Assistant Enseignant IA

Application web pour aider les enseignants (primaire, collège, lycée) en Afrique francophone à préparer leurs cours : génération de fiches de préparation par IA, bibliothèque personnelle, export PDF.

## Stack

- **Frontend** : React + Vite, CSS simple (pas de framework CSS lourd)
- **Auth + Base de données** : Supabase (Postgres + Auth), sécurisé par Row Level Security
- **IA** : OpenAI `gpt-4o-mini`, appelée uniquement depuis une fonction serverless Netlify (la clé API n'est jamais exposée au navigateur)
- **Paiements** : FedaPay (abonnement mensuel 2000 FCFA primaire / 3000 FCFA secondaire), création de transaction + webhook de confirmation via fonctions serverless Netlify. Essai gratuit de 7 jours à l'inscription (basé sur la date de création du compte), vérifié côté serveur dans chaque fonction de génération IA — pas seulement côté interface.
- **Hébergement** : Netlify (site statique + fonctions serverless)
- **Hors-ligne** : cache basique (PWA) — l'application et les fiches déjà consultées restent lisibles sans connexion ; la génération IA nécessite le réseau

## Mise en route

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL du projet, exécuter le contenu de [`supabase/schema.sql`](supabase/schema.sql)
3. Récupérer, dans **Project Settings → API** : l'URL du projet et la clé `anon public`

### 2. OpenAI

1. Créer une clé API sur [platform.openai.com](https://platform.openai.com)

### 3. FedaPay

1. Créer un compte sur [fedapay.com](https://fedapay.com) et récupérer les clés API (**Développeurs → Clés API**) — commencer en mode *sandbox* pour tester.
2. Dans **Développeurs → Webhooks**, ajouter un endpoint pointant vers `https://<ton-domaine>/.netlify/functions/fedapay-webhook`, abonné aux événements de transaction (approuvée/déclinée). Récupérer le secret de signature généré.
3. Dans Supabase **Project Settings → API**, récupérer la clé `service_role` (secrète — utilisée uniquement par le webhook pour activer les abonnements, jamais exposée au navigateur).

### 4. Variables d'environnement locales

Copier `.env.example` en `.env` et renseigner les valeurs :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
FEDAPAY_SECRET_KEY=...
FEDAPAY_ENV=sandbox
FEDAPAY_WEBHOOK_SECRET=...
SITE_URL=...
```

### 5. Installation et développement local

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

### 6. Déploiement sur Netlify

1. Pousser ce projet sur GitHub (ou glisser-déposer le dossier dans Netlify)
2. Créer un nouveau site Netlify à partir du dépôt (`netlify.toml` configure déjà la commande de build et les redirections)
3. Dans **Site settings → Environment variables**, renseigner : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FEDAPAY_SECRET_KEY`, `FEDAPAY_ENV`, `FEDAPAY_WEBHOOK_SECRET`, `SITE_URL`
4. Déclencher un déploiement
5. Une fois le site en ligne, mettre à jour l'URL du webhook FedaPay (étape 3 ci-dessus) avec le vrai domaine

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
