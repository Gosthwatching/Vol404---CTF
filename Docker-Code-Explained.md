# Explication simple : Docker dans ce projet

L'objectif ici est de comprendre **pourquoi** chaque ligne existe, sans jargon inutile.

---

## L'idée de base : c'est quoi Docker ?

Imagine que ton application a besoin de trois choses pour tourner :
- Node.js (pour le serveur)
- MongoDB (pour la base de données)
- mongo-express (pour voir la base via un navigateur)

Sans Docker → chaque personne installe tout ça sur sa machine différemment → "ça marche chez moi mais pas chez toi".

Avec Docker → on décrit tout dans des fichiers texte, et Docker crée des **boîtes isolées** (appelées **conteneurs**) qui contiennent exactement ce qu'il faut. Même machine, même résultat partout.

---

## Les deux fichiers importants

| Fichier | Rôle |
|---|---|
| `Dockerfile` | Décrit comment **construire** l'image de l'application Node.js |
| `docker-compose.yml` | Décrit comment **lancer ensemble** les 3 services (app + mongo + mongo-express) |

---

## Fichier 1 : `Dockerfile` — construire l'image Node.js

```dockerfile
FROM node:22-alpine
```
**"Pars d'une image existante"** : Node.js version 22, sur Alpine (une version de Linux très légère, ~5 Mo au lieu de ~200 Mo).

```dockerfile
WORKDIR /app
```
**"Crée un dossier `/app` dans la boîte et travaille dedans"**. Toutes les commandes suivantes s'exécutent depuis là.

```dockerfile
COPY package*.json ./
RUN npm ci
```
**Pourquoi copier `package.json` en premier, avant le reste du code ?**
Docker construit l'image en couches. Si le code change mais pas `package.json`, Docker réutilise la couche `npm ci` déjà en cache → build beaucoup plus rapide.

`npm ci` = comme `npm install` mais strictement reproductible (lit `package-lock.json` à la lettre).

```dockerfile
COPY . .
```
**"Maintenant copie tout le reste du projet"** (le code source, les vues, etc.).

```dockerfile
EXPOSE 3000
```
**Juste une documentation**. Dit "ce conteneur écoute sur le port 3000". N'ouvre rien tout seul.

```dockerfile
RUN printf "npm run seed\nnpm start\n" > batch.sh
RUN chmod +x batch.sh
ENTRYPOINT ["sh", "./batch.sh"]
```
**Ce qui se lance au démarrage du conteneur** :
1. `npm run seed` → remplit la base de données avec les données de départ (vols, passagers…)
2. `npm start` → lance le serveur Node.js

On utilise un petit script shell `batch.sh` parce que `ENTRYPOINT` ne permet qu'une seule commande, et Alpine n'a pas `bash`, seulement `sh`.

---

## Fichier 2 : `docker-compose.yml` — orchestrer les 3 services

### Service `app` — le serveur Node.js

```yaml
app:
  build:
    context: .
  container_name: vol404-app
  restart: unless-stopped
  ports:
    - "3000:3000"
  env_file:
    - .env
  depends_on:
    - mongo
```

| Ligne | Ce que ça fait |
|---|---|
| `build: context: .` | Utilise le `Dockerfile` dans le dossier courant pour construire l'image |
| `container_name: vol404-app` | Nomme le conteneur (plus lisible que l'ID aléatoire) |
| `restart: unless-stopped` | Redémarre automatiquement si le serveur plante, sauf si tu l'arrêtes manuellement |
| `ports: "3000:3000"` | `port_machine:port_conteneur` → ton navigateur sur `localhost:3000` parle au port 3000 du conteneur |
| `env_file: .env` | Charge les variables d'environnement depuis ton fichier `.env` |
| `depends_on: mongo` | Démarre `mongo` **avant** `app` |

---

### Service `mongo` — la base de données

```yaml
mongo:
  image: mongo:7
  container_name: vol404-mongo
  restart: unless-stopped
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_DATABASE: vol404
  volumes:
    - mongo_data:/data/db
```

| Ligne | Ce que ça fait |
|---|---|
| `image: mongo:7` | Utilise l'image officielle MongoDB 7 (pas de Dockerfile à écrire) |
| `ports: "27017:27017"` | Expose MongoDB sur ta machine (utile pour se connecter avec Compass) |
| `MONGO_INITDB_DATABASE: vol404` | Crée automatiquement la base `vol404` au premier démarrage |
| `volumes: mongo_data:/data/db` | **Persistance des données** : même si tu recrées le conteneur, les données survivent car elles sont stockées dans un volume nommé sur ta machine |

---

### Service `mongo-express` — l'interface web pour voir la base

```yaml
mongo-express:
  image: mongo-express:latest
  container_name: vol404-mongo-express
  ports:
    - "8082:8081"
  environment:
    ME_CONFIG_MONGODB_SERVER: mongo
    ME_CONFIG_BASICAUTH_USERNAME: admin
    ME_CONFIG_BASICAUTH_PASSWORD: vol404admin
  depends_on:
    - mongo
```

| Ligne | Ce que ça fait |
|---|---|
| `ports: "8082:8081"` | L'interface tourne sur le port 8081 dans le conteneur, accessible sur `localhost:8082` sur ta machine |
| `ME_CONFIG_MONGODB_SERVER: mongo` | Dit à mongo-express de se connecter au service nommé `mongo` (Docker résout les noms de services comme des noms de domaines internes) |
| `ME_CONFIG_BASICAUTH_*` | Login/mot de passe pour accéder à l'interface web |

---

### Le volume `mongo_data`

```yaml
volumes:
  mongo_data:
```

Cette section en bas **déclare** le volume. Docker le crée sur ta machine dans un endroit géré par Docker. Sans ça, toutes les données seraient perdues à chaque `docker compose down`.

---

## Schéma de ce qui tourne

```
Ta machine (Windows)
│
├─ localhost:3000  ──────→  conteneur vol404-app  (Node.js)
│                                   │
│                                   │ parle à "mongo:27017"
│                                   ▼
├─ localhost:27017 ──────→  conteneur vol404-mongo  (MongoDB)
│                                   │
│                              volume mongo_data
│                            (données persistantes)
│
└─ localhost:8082  ──────→  conteneur vol404-mongo-express  (UI web)
                                    │
                                    │ parle à "mongo:27017"
                                    ▼
                            conteneur vol404-mongo
```

---

## Les commandes à retenir

```bash
# Construire les images et tout démarrer
docker compose up --build

# Démarrer en arrière-plan (sans voir les logs)
docker compose up --build -d

# Arrêter les conteneurs (données conservées)
docker compose down

# Arrêter ET supprimer les données (repart de zéro)
docker compose down -v

# Voir les logs du serveur Node.js
docker compose logs app

# Voir ce qui tourne
docker compose ps
```

---

## Résumé en une phrase par fichier

- **`Dockerfile`** : recette pour créer la boîte qui fait tourner Node.js
- **`docker-compose.yml`** : chef d'orchestre qui crée et connecte les 3 boîtes ensemble
