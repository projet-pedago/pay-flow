# PayRollFlow

Gestion de paie en **microservices**. Les bulletins sont générés au format **officiel français** (Cerfa / bulletin de paie), sur le modèle d’un bulletin réel : ANTARES DS, matricule, SIRET, cotisations SANTE / RETRAITE / CSG, net à payer, PAS et cumuls.

Il n’y a **pas d’inscription**. Les comptes sont fournis par le service RH.

## Comptes de démonstration

| Rôle | Email | Mot de passe | Interface |
| --- | --- | --- | --- |
| Administrateur | `admin@payrollflow.demo` | `AdminHorizon2026!` | Console de pilotage |
| Collaborateur (bulletin officiel) | `yao.lassidan@payrollflow.demo` | `Horizon2026!` | Fiche de paie août 2026, à l’identique |
| Autres collaborateurs | leur email professionnel | `Horizon2026!` | Espace personnel |

Ouvrez **Mes bulletins → août 2026** avec le compte Yao Lassidan, puis **Imprimer / PDF** pour obtenir la fiche A4.

## Bulletin officiel

Le document reprend la structure légale :

- Période, paiement, matricule, ancienneté
- Employeur (SIRET, APE, convention Syntec, indice, coefficient, horaire)
- Salarié (adresse, n° sécu, emploi, département, catégorie)
- Tableau Désignation / Nombre / Base / Taux salarial / Gain / Retenue / Part employeur
- Totaux brut, cotisations, indemnités repas, compteurs de congés
- NET A PAYER, allègement Fillon, total versé par l’employeur
- Prélèvement à la source et cumuls période / année

Les paramètres société (adresse, SIRET, convention) et la fiche RH (matricule, n° sécu, horaire, tickets repas) alimentent le bulletin.

## Modules livrés

- Paie : cycles, bulletins officiels A4, acomptes déduits du net, export fichier de virement
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
