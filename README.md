# PayRollFlow

Application de **gestion de paie** (console admin, console RH, espace collaborateur) avec **bulletins officiels français A4**, API en microservices, et **connexion Microsoft Entra ID**.

Il n’y a **pas d’inscription en ligne**. Les comptes se créent dans Entra ID, avec un rôle applicatif PayFlow.

---

## Une commande Docker

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) ou Docker Engine + Compose (Linux).

1. Téléchargez le ZIP GitHub (**Code → Download ZIP**) et dézippez-le.
2. Ouvrez un terminal **dans le dossier du projet** (`pay-flow-main` ou `pay-flow`).
3. Une seule commande :

```bash
docker compose up --build
```

Cette commande télécharge les images de base (`node`, `nginx`), construit les 6 services (`auth`, `hr`, `payroll`, `time`, `gateway`, `frontend`) et les démarre.

4. Ouvrez **http://127.0.0.1:45217/login**
5. Cliquez **Se connecter avec Microsoft**. Les rôles Entra `PAYFLOW_ADMIN`, `PAYFLOW_HR` et `PAYFLOW_EMPLOYEE` ouvrent `/admin`, `/rh` et `/espace`.

Arrêt : `Ctrl + C`, puis `docker compose down` si vous voulez aussi supprimer les conteneurs. Les données restent dans le volume `payroll-data`.

Relance plus tard (images déjà construites) : `docker compose up`.

Aucun `npm install` n’est nécessaire avec Docker. Un fichier `.env` n’est pas obligatoire : les identifiants Entra publics sont déjà dans `docker-compose.yml`. Pour la liste Admin / RH des comptes PayFlow, copiez `.env.example` vers `.env` et renseignez `AZURE_GRAPH_CLIENT_SECRET`.

---

## Ce que contient le projet

| Partie | Dossier | Rôle |
| --- | --- | --- |
| Interface | `frontend/` | React 19 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion |
| API | `backend/` | Express 5, 4 microservices + passerelle |
| Données métier | `backend/data/store.json` | Fiches, bulletins, congés rattachés à l’oid Microsoft. Créé au premier lancement (départements + barème, sans employés de démo) |
| Docker | `docker-compose.yml` | 6 images (auth, hr, payroll, time, gateway, frontend) |

### Console administrateur (`/admin`)

- Pilotage (KPI, alertes, anomalies, **absentéisme**, **coût moyen**, **hommes/femmes**, **types de contrats**, prévision 3 mois)
- **Assistant RH** : questions sur le solde de congés, le bulletin, une simulation d’augmentation (données réelles, sans hallucination)
- **Calcul du bulletin** : simulation pas à pas + **hausse de salaire / prime** et écart de charges
- **Réseau & factures** : salariés internes, clients internes, entreprises facturées, freelances, intérim, portage
- **Utilisateurs** : comptes Entra `PAYFLOW_*` (Graph, lecture seule)
- Fiches RH (contrat, salaire, **date de fin de contrat**, alertes d’échéance, export CSV) — créées à la première connexion Microsoft
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
- Vider les données métier (fiches, bulletins, demandes — pas les comptes Entra)

### Espace collaborateur (`/espace`)

- Accueil (dernier net, soldes de congés)
- Mes bulletins (consultation + impression + QR)
- Demandes de congés / RTT + **calendrier**
- **Historique des demandes**
- Demandes d’acompte
- Dossier RH (CNI, RIB, contrat, Vitale)
- **Attestations** (travail, certificat de salaire)
- Assistant RH
- Profil (téléphone, adresse, ville, IBAN — le salaire, le contrat et le matricule sont en lecture seule)

### Console RH (`/rh`)

- Comptes Entra `PAYFLOW_EMPLOYEE` uniquement (pas d’Admin)
- Fiches RH (contrat, salaire, congés, acomptes, documents)
- Assistant RH
- Aucune création manuelle de collaborateur : la fiche apparaît à la première connexion Microsoft

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

- **Docker Desktop** (recommandé) — une commande lance toute l’application
- (optionnel) **Node.js 22+** si vous préférez `npm run dev` sans Docker
- (optionnel) un projet **Supabase** (Auth email + mot de passe)

Windows : préférez **WSL2 (Ubuntu)** + Node installé **dans WSL**, pas Git Bash seul.

```bash
node -v    # v22.x recommandé
npm -v
```

---

## Télécharger / ouvrir le projet

L’archive **PayRollFlow.zip** (GitHub → Code → Download ZIP) contient le code source, les Dockerfiles et `docker-compose.yml`. Elle **n’inclut pas** :

- `node_modules/` (Docker les installe pendant `docker compose up --build`)
- `.git/`
- `.env` (secrets Graph — optionnel, voir `.env.example`)
- `backend/data/store.json` (créé dans le volume Docker au premier lancement)

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

La clé **secret** ne doit **jamais** aller dans le frontend ni dans Git. `JWT_SECRET` signe le cookie httpOnly : en production l’API refuse de démarrer s’il est absent ou trop court.

| Mode | Quand | Comportement |
| --- | --- | --- |
| Microsoft Entra ID | `frontend/.env.local` (`VITE_AZURE_*`) + `AZURE_*` côté API | Seule connexion. Rôle applicatif `PAYFLOW_ADMIN` / `PAYFLOW_HR` / `PAYFLOW_EMPLOYEE`. Redirect URI SPA : origine (`http://127.0.0.1:45217` et `http://localhost:45217`). |
| Lecture Graph | `AZURE_GRAPH_CLIENT_ID` + `AZURE_GRAPH_CLIENT_SECRET` (PayFlow-Provisioning) | Liste Admin / RH des comptes Entra ayant un rôle PayFlow. Jamais dans `VITE_*`. |

La connexion email / mot de passe de démonstration (`@payrollflow.demo`, `store.users`) n’existe plus. La session navigateur est un cookie `httpOnly`.

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
AZURE_GRAPH_CLIENT_ID=
AZURE_GRAPH_CLIENT_SECRET=
AZURE_PAYFLOW_ROLE_ADMIN_ID=
AZURE_PAYFLOW_ROLE_HR_ID=
AZURE_PAYFLOW_ROLE_EMPLOYEE_ID=
```

Dans Entra ID → App registrations → **PayFlow-Frontend** → Authentication → Single-page application, ajoutez :

- `http://127.0.0.1:45217`
- `http://localhost:45217`

L’application API doit exposer le périmètre `access_as_user` et les rôles applicatifs `PAYFLOW_ADMIN`, `PAYFLOW_HR`, `PAYFLOW_EMPLOYEE`. Le bouton **Se connecter avec Microsoft** demande `openid`, `profile` et `api://{VITE_AZURE_API_CLIENT_ID}/access_as_user`. Un compte Entra authentifié **sans** rôle PayFlow reçoit HTTP 403.

Les comptes de connexion se créent **uniquement dans Microsoft Entra ID**. `GET /api/entra/users` lit Graph (application **PayFlow-Provisioning**, lecture seule) et n’affiche que les utilisateurs auxquels un rôle PayFlow a été attribué :

| Connecté comme | Comptes visibles |
| --- | --- |
| ADMIN | PAYFLOW_ADMIN + PAYFLOW_HR + PAYFLOW_EMPLOYEE |
| RH | PAYFLOW_EMPLOYEE uniquement |
| EMPLOYEE | 403 — aucune liste |

Permission Graph minimale : `User.Read.All` (liste des utilisateurs et de leurs `appRoleAssignments`). `Application.Read.All` (ou `Directory.Read.All`) est optionnelle : sans elle, PayFlow associe les GUID de rôles connus (`AZURE_PAYFLOW_ROLE_*_ID` ou valeurs intégrées). Aucune écriture Entra. Seule l’application entreprise **PayFlow** compte ; **PayFlow-Frontend** et **PayFlow-Provisioning** sont ignorées.

### Identité unique Microsoft

Il n’y a **pas** de second compte à créer dans PayRollFlow, **pas** d’association manuelle. Entra ID fournit l’identité (`oid`, prénom, nom, email) et le rôle. PayRollFlow attache automatiquement les données RH à cet `oid`.

```
MICROSOFT ENTRA ID
        │
Compte + identité + rôle
        │
  Connexion Microsoft
        │
  Token Entra vérifié
        │
┌───────┼────────┐
│       │        │
ADMIN   RH    EMPLOYEE
│       │        │
/admin  /rh   /espace
        │
  oid Microsoft
        ▼
  DONNÉES PAYFLOW
```

À la **première connexion**, PayRollFlow crée la fiche interne :

`oid` + nom + email + rôle → `employees[]` (`entraObjectId`, `firstName`, `lastName`, `email`, `directoryRole`). Les connexions suivantes rechargent la même fiche. `POST /api/employees` et l’import CSV répondent **410** : on ne crée plus de nom à la main.

Les rôles Entra ouvrent respectivement `/admin`, `/rh` et `/espace`.

| Rôle | Voit | Ne voit pas |
| --- | --- | --- |
| EMPLOYEE | Son profil, contrat, salaire, bulletins, congés, demandes, acomptes, documents | Autres employés, comptes RH / Admin, autres salaires |
| RH | Comptes `PAYFLOW_EMPLOYEE` (Graph) + fiches / contrats / congés / acomptes / documents | Comptes Admin, liste complète Entra |
| ADMIN | Tous les `PAYFLOW_*` (Graph) + paie, bulletins, paramètres | — |

L’employé peut modifier téléphone, adresse, code postal, ville, pays, IBAN. Salaire, rôle, matricule, type de contrat, poste, département, date d’embauche et bulletins restent gérés par RH / Admin.

Chaîne métier :

`compte Microsoft (oid)` → `employees[].entraObjectId` → salaire, bulletins, contrat, congés, demandes, documents.

Si une erreur **AADSTS…** apparaît après le redémarrage, le code complet indique la prochaine correction (URI de redirection, consentement, audience).

Sans secret Graph, le **login Microsoft** fonctionne. Le secret de **PayFlow-Provisioning** sert uniquement à **lire** l’annuaire des rôles PayFlow (`GET /api/entra/users`). Jamais dans `VITE_*`.

### Projet de démo déjà branché

Pour tester tout de suite avec le projet utilisé en développement :

```env
VITE_SUPABASE_URL=https://brohcfjzytrajqzhcchl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_r823ijwDyX9uvYmPoJHSRA_mUcV4QMy
```

Même URL / publishable dans `backend/.env`. La secret se copie depuis **Supabase → Project Settings → API Keys** (publishable & secret).

**Important :** l’URL et la clé publishable doivent appartenir au **même** projet. Une clé d’un autre projet donne `Invalid API key`.

---

## Lancer sans Docker (Node.js)

Deux terminaux, **depuis la racine du projet dézippé**. Nécessite Node.js 22+.

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

Au premier démarrage, `backend/data/store.json` est créé (société ANTARES DS, départements, barème URSSAF). Aucun employé, bulletin ni compte de démo. Les fiches apparaissent à la première connexion Microsoft.

La migration **schemaVersion 8** vide les anciens jeux de démo (`users`, `employees`, `payslips`, `leaves`, `advances`, `documents`, `notifications`) tout en conservant départements et paramètres. Les fiches Microsoft déjà provisionnées (schema ≥ 8) ne sont pas effacées.

### Vider les données métier

**Admin → Paramètres → Vider les données métier**

Cela régénère `store.json` (départements + barème, fiches vides). Les comptes Microsoft Entra ne sont pas touchés : leur fiche interne se recrée à la prochaine connexion.

---

## Docker

Commande unique, à la racine du ZIP décompressé :

```bash
docker compose up --build
```

| Service Compose | Conteneur | Rôle | Port hôte |
| --- | --- | --- | --- |
| `frontend` | payrollflow-web | Interface Nginx | **45217** |
| `gateway` | payrollflow-gateway | Passerelle API | **45218** |
| `auth` | payrollflow-auth | Connexion Microsoft | interne |
| `hr` | payrollflow-hr | Fiches, Entra Graph | interne |
| `payroll` | payrollflow-payroll | Paie, bulletins | interne |
| `time` | payrollflow-time | Congés, dossiers | interne |

- Application : http://127.0.0.1:45217
- Santé API : http://127.0.0.1:45218/api/health

Les identifiants SPA Entra (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_API_CLIENT_ID`) sont fournis par défaut au **build** du frontend. Un `.env.local` Vite n’est **pas** lu dans l’image. Après un changement Azure :

```bash
docker compose down
docker compose up --build
```

Arrêt : `docker compose down`. Les données JSON vivent dans le volume Docker `payroll-data`.

---

## Comptes

Pas d’inscription, pas de login email/mot de passe. Les comptes visibles dans PayRollFlow sont ceux d’Entra ID auxquels un rôle PayFlow a été attribué.

Les fiches `employees[]` (paie, bulletins, congés) sont des objets métier rattachés à l’oid Entra. Elles se créent à la première connexion, elles ne sont plus des comptes de démo.

### Bulletin officiel

Après connexion d’un `PAYFLOW_EMPLOYEE`, le RH / Admin complète contrat et salaire, calcule un cycle, puis le collaborateur ouvre **Mes bulletins**. Le moteur reprend la structure d’un bulletin français A4 (voir plus bas).

---

## Architecture API

```
Navigateur :45217
    └─ /api/*  →  passerelle :45218
                     ├─ auth     :45231   POST /api/auth/microsoft  GET /api/auth/me
                     ├─ hr       :45232   entra/users, fiches, départements, profil
                     ├─ payroll  :45233   cycles, bulletins, acomptes, settings, dashboard
                     └─ time     :45234   congés, dossiers, notifications
```

Toutes les routes (sauf health) exigent le cookie httpOnly `payrollflow_token`. 5 échecs de login Microsoft sur 15 min (IP) → HTTP 429.

| Méthode | Chemin | Usage |
| --- | --- | --- |
| POST | `/api/auth/microsoft` | Jeton d’accès Entra (`access_as_user`) → session cookie |
| GET | `/api/auth/me` | Session courante |
| GET | `/api/entra/users` | Comptes Entra ayant un rôle PayFlow (admin : tous, RH : employés, salarié : 403) |
| GET/PUT | `/api/employees` | Fiches RH (GET : RH = salariés, Admin = salariés ou `?scope=directory`) |
| PUT | `/api/me/profile` | Coordonnées personnelles du salarié connecté |
| POST | `/api/employees` | 410 — fiche créée à la première connexion Microsoft |
| GET/POST | `/api/payroll/periods` | Cycles |
| POST | `/api/payroll/periods/:id/calculate` | Calcul des bulletins |
| POST | `/api/payroll/periods/:id/validate` | Validation |
| POST | `/api/payroll/periods/:id/pay` | Paiement |
| GET | `/api/payroll/periods/:id/export` | CSV virements |
| GET | `/api/payroll/payslips/:id` | Bulletin officiel |
| GET/PUT | `/api/settings` | Société + barème |
| POST | `/api/settings/reset` | Vide fiches / paie / demandes (pas Entra) |
| GET/POST | `/api/leaves` | Congés |
| GET/POST | `/api/advances` | Acomptes |
| GET | `/api/documents` | Dossier RH |
| GET | `/api/notifications` | Cloche |

Exemple : session Microsoft déjà posée (cookie) puis liste Entra :

```bash
curl -s http://127.0.0.1:45218/api/health
curl -b /tmp/pf.jar -s http://127.0.0.1:45218/api/auth/me
curl -b /tmp/pf.jar -s http://127.0.0.1:45218/api/entra/users
```

Les départements initiaux : `DG`, `RH`, `ING`, `OPS`, `FIN`, `CDP`.

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
| `Email ou mot de passe incorrect` | Ancien login local : utilisez uniquement **Se connecter avec Microsoft** |
| `Session expirée` | Ancien jeton / cookie : déconnectez-vous, videz les cookies du site, relancez `npm run dev` (backend + frontend), reconnectez-vous |
| `Service indisponible` | L’API n’est pas démarrée (`cd backend && npm run dev`) |
| Port déjà utilisé | Changer le port Vite dans `frontend/vite.config.ts` (45217) ou tuer le processus qui occupe le port |
| Données bizarres | Admin → Paramètres → Vider les données métier |
| Windows, `npm` introuvable | Installer Node **dans WSL**, lancer les commandes depuis Ubuntu |
| `unzip` introuvable (WSL) | `sudo apt update && sudo apt install unzip` |
| Docker : `port is already allocated` | Un `npm run dev` occupe déjà 45217/45218 : arrêtez-le, ou `docker compose down` puis relancez |
| Docker : frontend sans login Microsoft | Les `VITE_AZURE_*` sont figés au `docker compose up --build` : reconstruire après changement de `.env` |

---

## Stack

- Frontend : React 19, Vite 8, TypeScript, Tailwind 4, shadcn/ui, React Router 7, `@supabase/supabase-js`
- Backend : Node 22, Express 5, Zod, JWT local (secours), Supabase Auth
- Données locales : JSON (`backend/data/store.json`) avec verrou de fichier entre microservices
- Auth : Microsoft Entra ID (rôles `PAYFLOW_*`), session dans un cookie `httpOnly` (pas de token dans `localStorage`)
- Conteneurs : Docker Compose, Node 22 Alpine (API), Nginx (frontend)

---

## Licence / usage

Projet interne. Les n° SIRET / sécu / IBAN d’exemple dans les paramètres société sont **fictifs** (modèle de bulletin).
