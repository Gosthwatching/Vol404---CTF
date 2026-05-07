# Phishing + Token Flow (version simple)

Ce document resume ce qui a ete implemente pour le flow phishing -> token -> unlock flag.

## Schema global

1. Joueur soumet un lien depuis la page flag.
2. API recoit le lien et cree un report en `pending`.
3. Worker serveur (toutes les 30s) prend un report `pending`.
4. Si URL conforme, worker genere un token temporaire (5 min) et marque `success`.
5. Joueur recupere le token via la route de resultat.
6. Joueur envoie le token a `/flag/unlock`.
7. Backend valide le token (usage unique) et met `flagUnlocked = true` en session.
8. Joueur peut soumettre le code final sur `/flag`.

## Schema technique court

1. Front: `frontend/flag.html` + `frontend/assets/JS/flag.js`
2. Routes phishing: `src/routes/phish.js`
3. Controller phishing: `src/controllers/phishController.js`
4. Queue + worker + tokens: `src/utils/phishQueue.js`
5. Unlock flag: `src/controllers/flagController.js`
6. Routes flag: `src/routes/flag.js`
7. Serveur: `src/server.js`

## Explication fichier par fichier

### 1) src/utils/phishQueue.js

Role: coeur du systeme phishing V1 (en memoire).

Contient:

- `reports`:
  - tableau des reports soumis par les joueurs.
- `issuedTokensByUser`:
  - map `userId -> { token, expiresAt }`.
- `submitReport({ userId, url })`:
  - Entree: userId + url
  - Traitement: cree un report `pending`
  - Sortie: report avec `id`
- `startPhishReviewWorker()`:
  - lance un interval toutes les 30s
  - prend 1 report `pending`
  - accepte seulement les URLs qui commencent par `/phish/page/`
  - si accepte: genere un token (TTL 5 min), `status = success`
  - si refuse: `status = failed` + message
- `getReportForUser({ userId, reportId })`:
  - lit le report du joueur
- `consumePhishToken({ userId, token })`:
  - valide le token pour le joueur
  - supprime le token si valide (usage unique)

### 2) src/controllers/phishController.js

Role: endpoints phishing.

- `createReport` (POST `/phish/report`):
  - valide la `url`
  - appelle `submitReport`
  - retourne `reportId`
- `getReportResult` (GET `/phish/result/:reportId`):
  - retourne `status`, `reason`, `token`, `expiresAt`

### 3) src/routes/phish.js

Role: declaration des routes phishing.

- `POST /phish/report`
- `GET /phish/result/:reportId`

Les routes passent par `authMiddleware` (utilisateur connecte requis).

### 4) src/server.js

Role: branchement global.

- ajoute `app.use('/phish', require('./routes/phish'))`
- lance `startPhishReviewWorker()` au demarrage

### 5) src/controllers/flagController.js

Role: verrouillage/deverrouillage flag + validation finale.

- `unlockFlagPage`:
  - recoit un token
  - appelle `consumePhishToken`
  - si valide: `req.session.flagUnlocked = true`
- `checkFlag`:
  - refuse si `flagUnlocked` est false
  - sinon valide le code et renvoie le flag

### 6) src/routes/flag.js

Role: routes de la zone flag.

- `POST /flag` (soumission code final)
- `POST /flag/unlock` (token phishing)
- `GET /flag/status` (etat de deblocage)

Note: route demo `POST /flag/token` retiree pour garder un flow unique phishing.

### 7) frontend/flag.html

Role: interface de l etape phishing + unlock + validation finale.

Contient:

- bloc soumission URL phishing
- bloc verification resultat report
- champ token + bouton debloquer
- section finale pour soumettre le code

### 8) frontend/assets/JS/flag.js

Role: logique client de la page flag.

- `btnPhishReport`:
  - envoie `POST /phish/report`
  - affiche le `reportId`
- `btnPhishCheck`:
  - appelle `GET /phish/result/:reportId`
  - gere `pending/failed/success`
  - si success: met le token dans le champ
- `btnUnlock`:
  - appelle `POST /flag/unlock`
  - affiche la section finale si OK
- `btnSubmitFlag`:
  - appelle `POST /flag`
  - affiche le flag retourne

## Test rapide du flow

1. Ouvrir `/flag.html` en etant connecte.
2. Mettre URL: `/phish/page/demo`.
3. Cliquer `Soumettre lien`.
4. Attendre environ 30 secondes.
5. Cliquer `Verifier resultat`.
6. Copier/laisser le token dans le champ.
7. Cliquer `Debloquer`.
8. Entrer le code final (ex: `94`) et valider.

## Limites de cette V1

1. Stockage en memoire (pas de persistance DB).
2. Reports/tokens perdus au redemarrage serveur.
3. Regle URL volontairement simple pour l apprentissage.

## Evolution V2 possible

1. Persister reports/tokens en MongoDB.
2. Ajouter nettoyage automatique des reports anciens.
3. Ajouter anti-abus (rate limit par user).
4. Ajouter un statut plus detaille pour suivi prof.
