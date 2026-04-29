# Guide Docker Complet - TP CTF Vol 404

Ce guide explique simplement:

1. Ce que fait Docker dans ce TP
2. Comment l'architecture est construite
3. Les commandes a utiliser au quotidien
4. Les erreurs frequentes et comment les corriger

---

## 1) Pourquoi Docker dans ce TP

Sans Docker, chaque etudiant doit installer et configurer MongoDB localement.
Avec Docker, on lance tout avec des commandes simples et identiques pour tout le monde.

Dans ce projet, Docker sert a:

1. Lancer l'application Node.js
2. Lancer MongoDB
3. Lancer mongo-express (interface web Mongo)

---

## 2) Architecture de ton projet Docker

Ton fichier compose est dans [docker-compose.yml](docker-compose.yml).

Services declares:

1. app
   - Construit depuis [Dockerfile](Dockerfile)
   - Expose le port 3000
   - Depend de mongo
2. mongo
   - Image officielle mongo:7
   - Expose le port 27017
   - Donnees persistantes via volume
3. mongo-express
   - Interface d'administration Mongo
   - Expose le port 8082

Volume declare:

1. mongo_data
   - Stocke les donnees Mongo meme si le conteneur est recree

---

## 3) Le Dockerfile explique simplement

Le Dockerfile est dans [Dockerfile](Dockerfile).

Etapes:

1. FROM node:22-alpine
   - Base legere Node.js 22
2. WORKDIR /app
   - Dossier de travail dans le conteneur
3. COPY package*.json ./
   - Copie package.json et package-lock.json
4. RUN npm ci
   - Installe les dependances de maniere reproductible
5. COPY . .
   - Copie le reste du projet
6. EXPOSE 3000
   - Documente le port utilise
7. CMD ["npm", "start"]
   - Lance le serveur (script start de package.json)

---

## 4) Variables d'environnement importantes

Le fichier local est [.env](.env).

Variables utiles:

1. PORT=3000
2. MONGO_URI=mongodb://localhost:27017/vol404
3. SESSION_SECRET=...
4. PUBLIC_BASE_URL=http://IP_DE_TON_PC:3000

Point tres important:

1. Pour le QR sur telephone, PUBLIC_BASE_URL ne doit pas etre localhost
2. Il faut mettre l'IP LAN de la machine qui heberge le serveur
3. Exemple: http://192.168.0.14:3000

Pourquoi:

1. localhost sur telephone = le telephone lui-meme
2. Donc le site devient inaccessible si le QR encode localhost

---

## 5) Commandes Docker essentielles (a connaitre)

### Demarrer tout (recommande)

```powershell
docker compose up -d --build
```

Explication:

1. --build reconstruit l'image app
2. -d lance en arriere-plan

### Voir les conteneurs

```powershell
docker compose ps
```

Explication:

1. Montre quels services tournent
2. Montre les ports exposes

### Voir les logs de l'app

```powershell
docker compose logs -f app
```

Explication:

1. Affiche les logs en direct
2. Ctrl+C quitte l'affichage sans stopper les conteneurs

### Stopper tout

```powershell
docker compose down
```

Explication:

1. Arrete et supprime les conteneurs du compose
2. Le volume mongo_data reste (donnees conservees)

### Redemarrer seulement app

```powershell
docker compose up -d app
```

Explication:

1. Pratique apres modif du code Node
2. Rapide sans toucher Mongo

---

## 6) Commandes utiles pour ce TP CTF

### Seed depuis l'hote (hors conteneur)

```powershell
npm run seed
```

### Seed depuis le conteneur app

```powershell
docker compose exec app node seed/seed.js
```

Quand utiliser quoi:

1. npm run seed: simple si Node local est operationnel
2. docker compose exec ...: utile pour avoir un environnement 100% conteneur

---

## 7) Ce qu'on a fait dans ce TP (resume concret)

1. Demarrage stack Docker (app, mongo, mongo-express)
2. Seed de la base
3. Debug erreur Mongo ECONNREFUSED
4. Correction du comportement QR (URL publique)
5. Mise en place d'un scan QR obligatoire avec redirection auto sur PC
6. Mise a jour de la doc solution

---

## 8) Erreurs frequentes et solutions

### Erreur: MongooseServerSelectionError ECONNREFUSED localhost:27017

Cause:

1. Mongo pas demarre
2. Mauvaise URI Mongo

Solution:

```powershell
docker compose up -d mongo
```

Puis relancer le seed.

---

### Erreur: le QR ouvre localhost sur le telephone

Cause:

1. PUBLIC_BASE_URL vide ou incorrect dans [.env](.env)

Solution:

1. Mettre PUBLIC_BASE_URL=http://IP_LAN_DU_PC:3000
2. Redemarrer app:

```powershell
docker compose up -d app
```

---

### Erreur: site inaccessible depuis le telephone

Checklist:

1. Telephone et PC sur le meme Wi-Fi
2. Tester l'URL manuellement sur le telephone
3. Verifier firewall Windows (port 3000)
4. Verifier docker compose ps

---

### Comportement normal a connaitre: docker compose up --build puis Ctrl+C

Explication:

1. Sans -d, Docker reste attache au terminal
2. Ctrl+C stoppe les conteneurs
3. C'est normal

Si tu veux laisser tourner:

```powershell
docker compose up -d --build
```

---

## 9) Bonnes pratiques pour un TP avec etudiants

1. Donner 3 commandes de base uniquement:
   - docker compose up -d --build
   - npm run seed
   - docker compose down
2. Fournir une verification rapide:
   - docker compose ps
   - ouvrir http://localhost:3000
3. Eviter localhost dans les QR (utiliser PUBLIC_BASE_URL)
4. Prevoir une mini section depannage dans le sujet

---

## 10) Sequence de demarrage recommandee (copier-coller)

```powershell
docker compose up -d --build
npm run seed
docker compose ps
```

Puis ouvrir:

1. http://localhost:3000
2. Optionnel: http://localhost:8082 (mongo-express)

---

## 12) Mode Public (URL cliquable pour les etudiants)

Objectif:

1. Generer une URL publique partageable
2. Les etudiants cliquent simplement cette URL
3. L'app se lance sans etre sur votre reseau local

### Option recommandee: Cloudflare Tunnel (gratuit)

Prerequis:

1. Docker stack deja demarree sur votre machine
2. App disponible en local sur http://localhost:3000

Installer cloudflared (Windows):

```powershell
winget install --id Cloudflare.cloudflared -e
```

Lancer le tunnel:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Resultat attendu:

1. Cloudflared affiche une URL du type https://xxxxx.trycloudflare.com
2. Partagez cette URL aux etudiants
3. Ils cliquent dessus et accedent directement a l'app

Important:

1. Garder le terminal cloudflared ouvert pendant la session
2. Si vous relancez le tunnel, l'URL peut changer
3. En mode tunnel, vous pouvez laisser PUBLIC_BASE_URL vide

Verification rapide:

1. Ouvrir l'URL publique depuis un autre reseau (ex: 4G)
2. Verifier que la page charge correctement
3. Sur billet.html, le QR doit pointer vers le domaine public (pas localhost)

---

## 11) References du projet

1. Compose: [docker-compose.yml](docker-compose.yml)
2. Build image app: [Dockerfile](Dockerfile)
3. Variables d'environnement: [.env](.env)
4. Ignore Docker context: [.dockerignore](.dockerignore)
5. Scripts npm: [package.json](package.json)
6. Solution CTF: [SolutionsCTF.md](SolutionsCTF.md)
