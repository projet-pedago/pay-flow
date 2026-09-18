# PayRollFlow

Application de **gestion de paie** (console RH + espace collaborateur) avec **bulletins officiels français A4**, API en microservices, et **connexion Supabase Auth** (ou login local de secours).

Il n’y a **pas d’inscription en ligne**. Les comptes sont créés par le service RH (ou par le jeu de démo).

---

## Démarrage en 5 minutes

1. Dézippez **PayRollFlow.zip** (voir [Télécharger](#télécharger--ouvrir-le-projet)).
2. Installez **Node.js 22+**.
3. Deux terminaux :

```bash
cd backend && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

4. Ouvrez **http://127.0.0.1:45217/login**
5. Connectez-vous :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Admin | `admin@payrollflow.demo` | `AdminHorizon2026!` |
| Salarié (bulletin PDF août 2026) | `yao.lassidan@payrollflow.demo` | `Horizon2026!` |

Sans fichiers `.env`, le login utilise le **jeu local** (JSON + mots de passe hashés). Avec Supabase, copiez `frontend/.env.example` et `backend/.env.example` (détail plus bas).

---

## Ce que contient le projet

| Partie | Dossier | Rôle |
| --- | --- | --- |
| Interface | `frontend/` | React 19 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion |
| API | `backend/` | Express 5, 4 microservices + passerelle |
| Données démo | `backend/data/store.json` | Créé automatiquement au premier lancement |
| Docker | `docker-compose.yml` | 6 images (auth, hr, payroll, time, gateway, frontend) |

### Console administrateur (`/admin`)

- Pilotage (KPI, alertes, anomalies, **absentéisme**, **coût moyen**, **hommes/femmes**, **types de contrats**, prévision 3 mois)
- **Assistant RH** : questions sur le solde de congés, le bulletin, une simulation d’augmentation (données réelles, sans hallucination)
- **Calcul du bulletin** : simulation pas à pas + **hausse de salaire / prime** et écart de charges
- **Réseau & factures** : salariés internes, clients internes, entreprises facturées, freelances, intérim, portage
- Employés (fiche RH, **date de fin de contrat**, alertes d’échéance, import/export CSV)
- Départements
- Cycles de paie (brouillon → calcul → validation → paiement, **versions de bulletins** conservées)
- Bulletins A4 (impression / PDF, **QR de vérification**)
- Congés (demande, validation RH, **calendrier partagé**, impact sur les jours du cycle)
- Acomptes, dossiers RH
- **Attestation de travail** et **certificat de salaire** (impression / PDF)
- Notifications in-app (génération de bulletin, absences, acomptes)
- Journal d’audit (calcul, validation, décisions d’absence)
- Paramètres société (SIRET, APE, convention, barème URSSAF)
- Export fichier de virement (CSV)
- Réinitialiser la démo

### Espace collaborateur (`/espace`)

- Accueil (dernier net, soldes de congés)
- Mes bulletins (consultation + impression + QR)
- Demandes de congés / RTT + **calendrier**
- **Historique des demandes**
- Demandes d’acompte
- Dossier RH (CNI, RIB, contrat, Vitale)
- **Attestations** (travail, certificat de salaire)
- Assistant RH
- Profil (téléphone, ville, IBAN)

### Stack visuelle (sans Next.js)

PayRollFlow reste sur **Vite + React**. Les ressources visuelles utilisées :

| Besoin | Source | Clé API |
| --- | --- | --- |
| Composants | shadcn/ui (Button, Card, Dialog, Input…) | Non |
| Icônes UI | Lucide | Non |
| Logos technologies | [Simple Icons](https://cdn.simpleicons.org) | Non |
| Logos entreprises / partenaires | Favicon du domaine (Google) | Non |
| Photos (login, accueil) | [Unsplash](https://unsplash.com) en URL directe | Non |
| Animations | Framer Motion (apparition, cartes, respect `prefers-reduced-motion`) | Non |
| Fonds lumineux | CSS aurora + grille (style Aceternity, sans librairie) | Non |

Logo.dev, Pexels, LottieFiles et Aceternity UI complet restent optionnels : ils demandent souvent une clé ou un copier-coller de composants. Ici, le rendu professionnel tient avec des sources gratuites.

---

## Prérequis

- **Node.js 22+** et **npm**
- (optionnel) **Docker Desktop** pour `docker compose`
- (optionnel) un projet **Supabase** (Auth email + mot de passe)

Windows : préférez **WSL2 (Ubuntu)** + Node installé **dans WSL**, pas Git Bash seul.

```bash
node -v    # v22.x recommandé
npm -v
```

---

## Télécharger / ouvrir le projet

L’archive **PayRollFlow.zip** contient le code source (README, frontend, backend, Docker). Elle **n’inclut pas** :

- `node_modules/` (à installer avec `npm install`)
- `.git/`
- `frontend/.env` et `backend/.env` (secrets — copiez les `.env.example`)
- `backend/data/store.json` (régénéré au premier `npm run dev`)

### Windows (Explorateur)

1. Clic droit sur `PayRollFlow.zip` → **Extraire tout…**
2. Ouvrez le dossier extrait dans Cursor / VS Code.

### PowerShell

```powershell
Expand-Archive .\PayRollFlow.zip -DestinationPath .\PayRollFlow
cd .\PayRollFlow
```

### WSL (Ubuntu)

```bash
unzip PayRollFlow.zip -d ~/PayRollFlow
cd ~/PayRollFlow
```

Arborescence attendue :

```
PayRollFlow/
├── README.md
├── docker-compose.yml
├── .gitignore
├── backend/          API + microservices
│   ├── .env.example
│   ├── package.json
│   ├── Dockerfile
│   └── src/
└── frontend/         Interface web
    ├── .env.example
    ├── package.json
    ├── Dockerfile
    └── src/
```

Pour versionner le projet dans Git : créez le dépôt depuis l’interface Cursor (**Create repo**), puis clonez-le. En attendant, l’archive zip suffit.

---

## Variables d’environnement

### Frontend — `frontend/.env`

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_SUPABASE_URL=https://VOTRE_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Cette clé **publishable** va dans le navigateur : c’est normal. Relancez Vite après toute modification des `VITE_*`.

### Backend — `backend/.env`

```bash
cp backend/.env.example backend/.env
```

```env
SUPABASE_URL=https://VOTRE_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
JWT_SECRET=  # openssl rand -base64 32 — obligatoire en production (≥ 16 caractères)
```

La clé **secret** ne doit **jamais** aller dans le frontend ni dans Git. `JWT_SECRET` signe le cookie httpOnly du login local : en production l’API refuse de démarrer s’il est absent ou trop court.

| Mode | Quand | Comportement |
| --- | --- | --- |
| Local | `SUPABASE_URL` vide | Email + mot de passe dans `store.json` |
| Supabase | URL + publishable renseignés | Mot de passe vérifié chez Supabase, rôle admin / employé rattaché à la fiche locale |
| Microsoft Entra ID | `frontend/.env.local` (`VITE_AZURE_*`) + `AZURE_*` côté API | Compte Entra + rôle applicatif `PAYFLOW_ADMIN` / `PAYFLOW_HR` / `PAYFLOW_EMPLOYEE`. Pas d’entrée obligatoire dans `store.users`. Redirect URI SPA : origine (`http://127.0.0.1:45217` et `http://localhost:45217`). |

Dans les deux cas, la session navigateur est un cookie `httpOnly` (pas de jeton dans `localStorage`).

### Microsoft Entra ID

Vite charge `frontend/.env.local` **au démarrage**. Un simple rafraîchissement navigateur ne suffit pas : arrêtez Vite (`Ctrl + C`) puis `npm run dev`.

`frontend/.env.local` (jamais Git, jamais de Client Secret) :

```env
VITE_AZURE_CLIENT_ID=
VITE_AZURE_TENANT_ID=
VITE_AZURE_API_CLIENT_ID=
```

`backend/.env` :

```env
AZURE_CLIENT_ID=
AZURE_TENANT_ID=
AZURE_API_CLIENT_ID=
```

Dans Entra ID → App registrations → **PayFlow-Frontend** → Authentication → Single-page application, ajoutez :

- `http://127.0.0.1:45217`
- `http://localhost:45217`

L’application API doit exposer le périmètre `access_as_user` et les rôles applicatifs `PAYFLOW_ADMIN`, `PAYFLOW_HR`, `PAYFLOW_EMPLOYEE`. Le bouton **Se connecter avec Microsoft** demande `openid`, `profile` et `api://{VITE_AZURE_API_CLIENT_ID}/access_as_user`. Un compte Entra authentifié **sans** rôle PayFlow reçoit HTTP 403. L’absence d’une fiche dans `store.users` n’empêche plus la connexion.

Les comptes de connexion se créent **uniquement dans Microsoft Entra ID**. `POST /api/employees` crée une fiche RH, pas un compte. Les rôles `PAYFLOW_ADMIN`, `PAYFLOW_HR` et `PAYFLOW_EMPLOYEE` ouvrent respectivement `/admin`, `/rh` et `/espace`.

Un salarié n’est pas identifié par son email RH. La chaîne est :

`compte Microsoft (oid)` → `employees[].entraObjectId` / `entraUserPrincipalName` → `employeeId` → salaire, bulletins, contrat, congés, demandes, documents.

Si l’UPN Entra (`emp-01@…onmicrosoft.com`) diffère de l’email de la fiche (`aminata.diallo@payrollflow.demo`), Admin ou RH associe le compte depuis **Employés → fiche → Compte Microsoft**. À la connexion suivante (ou à la prochaine requête `/api/me/*`, sans se reconnecter), l’oid est enregistré. Tant que la fiche n’est pas liée, l’espace collaborateur s’affiche vide au lieu de renvoyer HTTP 400.

Si une erreur **AADSTS…** apparaît après le redémarrage, le code complet indique la prochaine correction (URI de redirection, consentement, audience).

Sans secret, le **login** fonctionne. La secret sert surtout à **créer un compte Auth** quand un admin ajoute un employé.

### Projet de démo déjà branché

Pour tester tout de suite avec le projet utilisé en développement :

```env
VITE_SUPABASE_URL=https://brohcfjzytrajqzhcchl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_r823ijwDyX9uvYmPoJHSRA_mUcV4QMy
```

Même URL / publishable dans `backend/.env`. La secret se copie depuis **Supabase → Project Settings → API Keys** (publishable & secret).

**Important :** l’URL et la clé publishable doivent appartenir au **même** projet. Une clé d’un autre projet donne `Invalid API key`.

---

## Lancer en local (recommandé)

Deux terminaux, **depuis la racine du projet dézippé**.

**Terminal 1 — API** (auth `:45231`, RH `:45232`, paie `:45233`, temps `:45234`, passerelle `:45218`)

```bash
cd backend
npm install
npm run dev
```

Attendez les lignes du type `listening` / démarrage des 5 processus.

**Terminal 2 — interface**

```bash
cd frontend
npm install
npm run dev
```

Puis ouvrez :

| Service | URL |
| --- | --- |
| Application | http://127.0.0.1:45217 |
| Login | http://127.0.0.1:45217/login |
| Santé API | http://127.0.0.1:45218/api/health |

Le frontend Vite proxifie `/api` vers la passerelle `45218`.

Au premier démarrage, `backend/data/store.json` est créé (société ANTARES DS, employés, cycles **juillet / août 2026** calculés, **septembre** en brouillon).

### Réinitialiser la démo

**Admin → Paramètres → Réinitialiser la démo**

Cela régénère `store.json` (pas les utilisateurs Supabase).

---

## Docker

À la racine du projet :

```bash
cp backend/.env.example .env
# remplissez SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
docker compose up --build
```

- Interface : http://127.0.0.1:45217
- API : http://127.0.0.1:45218

Les clés frontend (`VITE_…`) sont injectées **au build** de l’image à partir du `.env` racine (`SUPABASE_*`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`). Un `.env.local` Vite n’est **pas** lu dans l’image déjà construite. Après un changement Azure / Supabase :

```bash
docker compose down
docker compose build --no-cache frontend
docker compose up -d
```

Arrêt : `docker compose down`. Les données JSON vivent dans le volume Docker `payroll-data`.

---

## Comptes de démonstration

Pas d’inscription. Mot de passe unique pour tous les collaborateurs.

| Rôle | Email | Mot de passe | Après connexion |
| --- | --- | --- | --- |
| Administrateur | `admin@payrollflow.demo` | `AdminHorizon2026!` | `/admin` |
| Bulletin officiel (référence PDF) | `yao.lassidan@payrollflow.demo` | `Horizon2026!` | `/espace` → **Mes bulletins → août 2026** |
| Directrice | `aminata.diallo@payrollflow.demo` | `Horizon2026!` | `/espace` |
| Autres salariés | liste ci-dessous | `Horizon2026!` | `/espace` |

**Autres emails démo :**

- `jp.kouame@payrollflow.demo`
- `fatou.ndiaye@payrollflow.demo`
- `hugo.bernard@payrollflow.demo`
- `aicha.traore@payrollflow.demo`
- `lea.moreau@payrollflow.demo`
- `omar.benali@payrollflow.demo`
- `camille.roux@payrollflow.demo`
- `kwame.mensah@payrollflow.demo`
- `sofia.martins@payrollflow.demo`
- `yanis.haddad@payrollflow.demo`
- `ines.petit@payrollflow.demo`

Ces comptes existent dans **Supabase Auth** du projet de démo (emails confirmés).

Sur un **nouveau** projet Supabase :

1. Authentication → Users → Add user (email confirmé)
2. `app_metadata` : `{ "role": "admin" }` ou `{ "role": "employee" }`
3. L’email doit correspondre à une fiche dans `store.json` (ou créez l’employé depuis l’admin)

Sinon, laissez les variables Supabase vides et utilisez le **login local**.

### Bulletin à l’identique du PDF

1. Connectez-vous en `yao.lassidan@payrollflow.demo`
2. **Mes bulletins → août 2026**
3. **Imprimer / PDF**

Société affichée : ANTARES DS, matricule **1212**, période **01/08/26 – 31/08/26**, net **704,88**.

Côté admin : **Cycles de paie → août 2026 → bulletin de Yao Lassidan**.

---

## Architecture API

```
Navigateur :45217
    └─ /api/*  →  passerelle :45218
                     ├─ auth     :45231   POST /api/auth/login  GET /api/auth/me
                     ├─ hr       :45232   employés, départements, profil
                     ├─ payroll  :45233   cycles, bulletins, acomptes, settings, dashboard
                     └─ time     :45234   congés, dossiers, notifications
```

Toutes les routes (sauf login / health) exigent le cookie httpOnly `payrollflow_token` (posé à la connexion, y compris si Supabase vérifie le mot de passe). 5 échecs de login sur 15 min (IP + email) → HTTP 429.

| Méthode | Chemin | Usage |
| --- | --- | --- |
| POST | `/api/auth/login` | Email + mot de passe |
| POST | `/api/auth/microsoft` | Jeton d’accès Entra (`access_as_user`) → session cookie |
| GET | `/api/auth/me` | Session courante |
| GET/POST/PUT | `/api/employees` | Fiches RH (admin) |
| POST | `/api/employees/import` | Import CSV |
| GET/POST | `/api/payroll/periods` | Cycles |
| POST | `/api/payroll/periods/:id/calculate` | Calcul des bulletins |
| POST | `/api/payroll/periods/:id/validate` | Validation |
| POST | `/api/payroll/periods/:id/pay` | Paiement |
| GET | `/api/payroll/periods/:id/export` | CSV virements |
| GET | `/api/payroll/payslips/:id` | Bulletin officiel |
| GET/PUT | `/api/settings` | Société + barème |
| POST | `/api/settings/reset` | Reset démo |
| GET/POST | `/api/leaves` | Congés |
| GET/POST | `/api/advances` | Acomptes |
| GET | `/api/documents` | Dossier RH |
| GET | `/api/notifications` | Cloche |

Exemple de login **local** (cookie, sans token dans le JSON) :

```bash
curl -s http://127.0.0.1:45218/api/health
curl -c /tmp/pf.jar -s -X POST http://127.0.0.1:45218/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@payrollflow.demo","password":"AdminHorizon2026!"}'
curl -b /tmp/pf.jar -s http://127.0.0.1:45218/api/auth/me
```

### Import CSV employés

En-têtes :

```text
firstName,lastName,email,phone,departmentCode,jobTitle,contractType,hireDate,baseSalary,iban,city,country
```

Codes département démo : `DG`, `RH`, `ING`, `OPS`, `FIN`, `CDP`.

---

## Bulletin officiel (données)

Le moteur reprend la structure d’un bulletin français :

- En-tête : période, paiement, matricule, ancienneté
- Employeur : adresse, SIRET, APE/NAF, convention, indice, coef, horaire
- Salarié : civilité, adresse, n° sécu, emploi, département, catégorie
- Colonnes : Désignation / Nombre / Base / Taux salarial / Gain / Retenue / Part employeur
- Blocs SANTE, RETRAITE, famille, chômage, CSG, allègement Fillon
- Indemnités repas, compteurs de congés, NET A PAYER, PAS, cumuls période / année

Les champs société se règlent dans **Paramètres**. Les champs individuels (matricule, n° sécu, tickets repas, taux PAS) sont sur la fiche employé.

---

## Scripts npm

**Backend** (`backend/package.json`)

- `npm run dev` — auth + hr + paie + temps + gateway (watch)
- `npm run build` — `tsc --noEmit`

**Frontend** (`frontend/package.json`)

- `npm run dev` — Vite, port **45217**
- `npm run build` — build production
- `npm run lint` — oxlint

---

## Dépannage

| Problème | Piste |
| --- | --- |
| Page blanche / login infini | `frontend/.env` manquant ou mal lu : relancer Vite après modification des `VITE_*` |
| `Invalid API key` | URL Supabase et clé publishable ne sont pas du **même** projet |
| `Email ou mot de passe incorrect` | Compte absent dans Supabase Auth, ou email non confirmé — ou mot de passe différent du tableau ci-dessus |
| `Session expirée` | Ancien jeton / cookie : déconnectez-vous, videz les cookies du site, relancez `npm run dev` (backend + frontend), reconnectez-vous |
| `Service indisponible` | L’API n’est pas démarrée (`cd backend && npm run dev`) |
| Port déjà utilisé | Changer le port Vite dans `frontend/vite.config.ts` (45217) ou tuer le processus qui occupe le port |
| Données bizarres | Admin → Paramètres → Réinitialiser la démo |
| Windows, `npm` introuvable | Installer Node **dans WSL**, lancer les commandes depuis Ubuntu |
| `unzip` introuvable (WSL) | `sudo apt update && sudo apt install unzip` |
| Docker : frontend sans login Supabase | Les `VITE_*` sont figés au `docker compose up --build` : reconstruire après changement de `.env` |

---

## Stack

- Frontend : React 19, Vite 8, TypeScript, Tailwind 4, shadcn/ui, React Router 7, `@supabase/supabase-js`
- Backend : Node 22, Express 5, Zod, JWT local (secours), Supabase Auth
- Données locales : JSON (`backend/data/store.json`) avec verrou de fichier entre microservices
- Auth : mot de passe vérifié en local ou chez Supabase, puis session dans un cookie `httpOnly` (pas de token dans `localStorage`)
- Conteneurs : Docker Compose, Node 22 Alpine (API), Nginx (frontend)

---

## Licence / usage

Projet de démonstration interne. Les n° SIRET / sécu / IBAN du jeu de données sont **fictifs** (modèle de bulletin).
