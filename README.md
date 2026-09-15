# PayRollFlow

Gestion de paie en **microservices** : passerelle API, auth, RH, moteur de paie, et deux interfaces React (admin / collaborateur).

Il n’y a **pas d’inscription**. Les comptes sont fournis par le service RH.

## Comptes de démonstration

| Rôle | Email | Mot de passe | Interface |
| --- | --- | --- | --- |
| Administrateur | `admin@payrollflow.demo` | `AdminHorizon2026!` | Console de pilotage |
| Collaborateur | `aminata.diallo@payrollflow.demo` | `Horizon2026!` | Espace personnel |

Les autres employés se connectent avec le même mot de passe `Horizon2026!` et leur email professionnel.

## Architecture

```
frontend (React) → gateway :45218
                     ├─ auth     :45231   POST /api/auth/login, GET /api/auth/me
                     ├─ hr       :45232   /api/employees, /api/departments, /api/me/profile
                     └─ payroll  :45233   /api/payroll, /api/dashboard, /api/settings, /api/me/payslips
```

## Lancer en local

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

- Interface : http://127.0.0.1:45217
- Passerelle : http://127.0.0.1:45218/api/health

## Docker

Cinq images : `auth`, `hr`, `payroll`, `gateway`, `frontend`.

```bash
docker compose up --build
```
