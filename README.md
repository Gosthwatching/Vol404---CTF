# Vol404 - CTF

Projet CTF web base sur **Node.js**, **Express** et **MongoDB**.

## Presentation

Vol404 propose une experience de CTF autour d'un faux contexte aeroportuaire avec une interface web, des etapes de progression et des routes protegees.

## Prerequis

- Node.js recent
- npm
- MongoDB local ou via Docker
- Docker et Docker Compose si tu veux la version containerisee

## Installation rapide

1. Clone le depot.
2. Copie le fichier d'exemple d'environnement:

```bash
cp .env.example .env
```

Sous PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Remplis les valeurs du fichier `.env` si besoin.

Si tu es sur Windows PowerShell, tu peux aussi generer automatiquement le fichier d'environnement avec:

```powershell
.\init.ps1
```

## Variables d'environnement

Le projet utilise principalement:

- `PORT` : port du serveur web
- `SESSION_SECRET` : secret de session Express
- `PUBLIC_BASE_URL` : URL publique du projet
- `PROF_SECRET` : secret reserve au mode prof/admin
- `MONGO_URI` : URI MongoDB principale
- `MONGO_URI_LOCAL` : URI utilisee en execution locale
- `MONGO_URI_DOCKER` : URI utilisee dans Docker Compose

Le fichier `.env.example` contient les valeurs attendues.

## Lancer le projet avec Docker

C'est la methode la plus simple si tu veux un environnement complet.

```bash
docker compose up --build
```

Services exposes:

- Application: http://localhost:3000
- MongoDB: `localhost:27017`
- Mongo Express: http://localhost:8082

Le service applicatif lance aussi le seed au demarrage via l'image Docker.

## Lancer le projet en local

1. Demarre MongoDB.
2. Verifie que `MONGO_URI` ou `MONGO_URI_LOCAL` pointe vers ta base.
3. Installe les dependances:

```bash
npm install
```

4. Lance le seed si besoin:

```bash
npm run seed
```

Pour repartir de zero:

```bash
npm run seed:reset
```

5. Demarre le serveur:

```bash
npm start
```

## Acces utiles

Selon le parcours CTF, les pages principales se trouvent dans `frontend/` et sont servies par Express. Les entrees les plus utiles sont:

- `/register.html`
- `/login.html`
- `/index.html`
- `/home.html`
- `/questionnaire.html`
- `/puzzle.html`
- `/gate.html`
- `/flag.html`

## Structure du projet

- `src/` : serveur Express, routes, controllers, middlewares et connexion MongoDB
- `frontend/` : pages HTML, CSS et JavaScript
- `seed/` : jeu de donnees initial et script de seed
- `Dockerfile` et `docker-compose.yml` : environnement containerise

## Notes

- Le fichier `.env` ne doit pas etre commit.
- Si tu changes l'URL publique ou les secrets, pense a mettre a jour ton `.env` avant de lancer le projet.
- Si tu utilises Docker Compose, le service Mongo est accessible sous le nom `mongo` depuis le conteneur applicatif.
