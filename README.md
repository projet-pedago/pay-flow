# PayRollFlow

Gestion de paie en **microservices**, pensée comme un socle concurrentiel (PayFit, ADP, Sage, Cegid) : paie, temps, acomptes, dossier RH, conformité et espace collaborateur.

Il n’y a **pas d’inscription**. Les comptes sont fournis par le service RH.

## Comptes de démonstration

| Rôle | Email | Mot de passe | Interface |
| --- | --- | --- | --- |
| Administrateur | `admin@payrollflow.demo` | `AdminHorizon2026!` | Console de pilotage |
| Collaborateur | `aminata.diallo@payrollflow.demo` | `Horizon2026!` | Espace personnel |

Les autres employés se connectent avec le même mot de passe `Horizon2026!` et leur email professionnel.

## Modules livrés

- Paie : cycles, bulletins, acomptes déduits du net, export fichier de virement
- Temps : congés / RTT / maladie, soldes, validation RH
- Dossier RH : CNI, RIB, contrat, Vitale
- Conformité : IBAN, absences et acomptes en attente, pièces manquantes
- Notifications in-app (cloche) côté admin et collaborateur
- Import CSV des employés

## Architecture

```
frontend (React) → gateway :45218
                     ├─ auth     :45231   login / session
                     ├─ hr       :45232   employés, départements, import CSV
                     ├─ payroll  :45233   cycles, bulletins, acomptes, export
                     └─ time     :45234   congés, dossiers, notifications
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

Six images : `auth`, `hr`, `payroll`, `time`, `gateway`, `frontend`.

```bash
docker compose up --build
```
