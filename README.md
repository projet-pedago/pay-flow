# PayRollFlow

Application de **gestion de paie** : backend API + interface React, livrée avec deux images Docker (API et web).

Cette première version couvre le flux opérationnel :

1. Fiches employés et départements
2. Ouverture d’un cycle de paie
3. Saisie des jours, heures sup. et primes (totaux recalculés en direct)
4. Calcul, validation, puis paiement
5. Bulletin de paie détaillé (cotisations salariales / patronales)

Les données de démonstration concernent **Horizon Afrique Consulting**. Le barème est inspiré des cotisations françaises, simplifié et **modifiable** dans Paramètres (EUR ou XOF).

## Lancer en local (Cursor / IDE)

Deux terminaux :

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

- Interface : [http://127.0.0.1:45217](http://127.0.0.1:45217)
- API : [http://127.0.0.1:45218/api/health](http://127.0.0.1:45218/api/health)

Le frontend Vite proxy `/api` vers le backend.

## Docker

```bash
docker compose up --build
```

- Web : port **45217**
- API : port **45218**

Les données JSON de l’API sont persistées dans le volume `payroll-data`.

## Structure

```
backend/     API Express + TypeScript (moteur de paie)
frontend/    React + Vite + Tailwind
docker-compose.yml
```

## Suite prévue

Alignement sur les rapports DevOps Azure (pipelines, ACR, AKS / App Service, environnements). Envoyez les fichiers `.docx` dans le projet pour caler les écrans et le déploiement sur votre cahier des charges.
