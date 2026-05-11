# Explication technique : le système de Phishing

Ce document explique **comment le code du mécanisme de phishing a été conçu**, fichier par fichier, avec la logique de chaque brique.

---

## Vue d'ensemble : pourquoi un système de phishing ?

L'idée pédagogique est de faire simuler au joueur une attaque de phishing :

1. Il crée un faux lien (simulant une page piège).
2. Il soumet ce lien à un "admin bot" (le worker serveur).
3. Si le lien est jugé conforme, le bot "clique dessus" et génère un token.
4. Le joueur récupère le token et doit l'envoyer via la **console du navigateur** (apprentissage des DevTools).
5. Le token déverrouille la zone finale où se trouve le flag.

---

## Schéma du flux complet

```
[Joueur] soumet URL
    │
    ▼
POST /phish/report
    │  crée report { status: "pending" }
    │
    ▼
Worker (toutes les 30s)
    │  prend 1 report pending
    │  vérifie: URL commence par /phish/page/ ?
    │
    ├─ NON → status = "failed", raison = refus
    │
    └─ OUI → génère token (crypto 12 bytes)
             TTL = 5 min
             status = "success"
             stocke token dans issuedTokensByUser[userId]
    │
    ▼
GET /phish/result/:reportId
    │  joueur interroge le résultat
    │  si success → token renvoyé dans la réponse
    │
    ▼
window._phishToken = token  ← visible en console navigateur
    │
    ▼
POST /flag/unlock  (manuel en console)
    │  consumePhishToken() → vérifie token + TTL + usage unique
    │  session.flagUnlocked = true
    │
    ▼
POST /flag
    │  si flagUnlocked → donne le flag
    └─ sinon → 403
```

---

## Fichier 1 : `src/utils/phishQueue.js` — le cœur du système

C'est le seul endroit où vivent les données et la logique métier phishing.

### Structures de données

```js
const reports = [];
// Tableau de tous les reports soumis. Chaque report :
// { id, userId, url, status, createdAt, reviewedAt, reason, token, expiresAt }

const issuedTokensByUser = new Map();
// Map userId → { token: string, expiresAt: timestamp }
// Un seul token actif par joueur à la fois.
```

Tout est **en mémoire** (pas de base de données pour le phishing). Simple et suffisant pour un CTF.

---

### `submitReport({ userId, url })`

```js
const report = {
    id: crypto.randomBytes(12).toString('hex'),   // ID aléatoire non-prévisible
    userId: String(userId),
    url: String(url || '').trim(),
    status: 'pending',
    createdAt: now(),
    reviewedAt: null,
    reason: null,
    token: null,
    expiresAt: null
};
reports.push(report);
return report;
```

**Pourquoi `crypto.randomBytes` ?** Pour éviter qu'un joueur devine l'ID d'un autre joueur. Un UUID incrémental (1, 2, 3…) serait vulnérable à l'énumération (IDOR).

---

### `isAllowedPhishUrl(url)` — la règle de validation

```js
const isAllowedPhishUrl = (url) => {
    if (typeof url !== 'string') return false;
    return url.trim().startsWith('/phish/page/');
};
```

**Logique pédagogique :** Le joueur doit comprendre qu'il faut envoyer un lien relatif vers la fausse page d'hameçonnage hébergée sur le serveur lui-même (ex: `/phish/page/ma-page`). Toute URL externe ou aléatoire est refusée.

---

### `startPhishReviewWorker()` — le bot admin simulé

```js
setInterval(() => {
    purgeExpiredTokens();

    const pending = reports.find((r) => r.status === 'pending');
    if (!pending) return;

    pending.reviewedAt = now();

    if (!isAllowedPhishUrl(pending.url)) {
        pending.status = 'failed';
        pending.reason = 'URL refusée: utilisez /phish/page/<id> pour la demo.';
        return;
    }

    const token = crypto.randomBytes(12).toString('hex');
    const expiresAt = now() + PHISH_TOKEN_TTL_MS;  // +5 min

    issuedTokensByUser.set(pending.userId, { token, expiresAt });

    pending.status = 'success';
    pending.token = token;
    pending.expiresAt = expiresAt;

}, REPORT_REVIEW_INTERVAL_MS);  // toutes les 30s
```

**Choix de design :**
- **1 seul report traité par cycle** : simule un bot "humain" qui lit les signalements un à un. Évite aussi un flood de génération de tokens.
- **`workerStarted` flag** : le worker ne démarre qu'une seule fois même si le module est importé plusieurs fois (protection idempotence).
- **`purgeExpiredTokens()` à chaque cycle** : nettoyage passif de la Map pour éviter une fuite mémoire sur une session longue.

---

### `consumePhishToken({ userId, token })` — validation usage unique

```js
const consumePhishToken = ({ userId, token }) => {
    purgeExpiredTokens();

    const state = issuedTokensByUser.get(String(userId));
    if (!state) return { ok: false, error: 'Aucun token phishing actif.' };

    if (String(token || '').trim() !== state.token) {
        return { ok: false, error: 'Token phishing invalide.' };
    }

    // Usage unique : suppression immédiate après validation.
    issuedTokensByUser.delete(String(userId));
    return { ok: true };
};
```

**Sécurité :** Le token est **à usage unique**. Dès qu'il est consommé, il est supprimé de la Map. Même si un joueur tente de le réutiliser immédiatement, il reçoit une erreur.

---

## Fichier 2 : `src/controllers/phishController.js` — les endpoints HTTP

Deux routes simples qui délèguent tout à `phishQueue.js` :

| Route | Rôle |
|---|---|
| `POST /phish/report` | Reçoit l'URL, appelle `submitReport()`, renvoie le `reportId` |
| `GET /phish/result/:reportId` | Appelle `getReportForUser()`, renvoie le statut + token si success |

```js
// POST /phish/report
const createReport = (req, res) => {
    const url = String(req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'url requise.' });

    const report = submitReport({ userId: req.session.user.id, url });
    return res.json({ ok: true, reportId: report.id, status: report.status });
};

// GET /phish/result/:reportId
const getReportResult = (req, res) => {
    const report = getReportForUser({
        userId: req.session.user.id,
        reportId: req.params.reportId
    });

    if (!report) return res.status(404).json({ error: 'Report introuvable.' });
    return res.json({ ...report });
};
```

**Sécurité :** `getReportForUser` filtre sur `userId === req.session.user.id` → un joueur **ne peut pas lire le report d'un autre** même s'il connaît l'ID (IDOR bloqué).

---

## Fichier 3 : `src/controllers/flagController.js` — unlock de la zone flag

```js
const unlockFlagPage = (req, res) => {
    const token = String(req.body.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token requis.' });

    const phishResult = consumePhishToken({ userId: req.session.user.id, token });
    if (!phishResult.ok) return res.status(401).json({ error: 'Token invalide ou expiré.' });

    req.session.flagUnlocked = true;
    return res.json({ success: true, redirect: '/flag.html' });
};
```

**Pourquoi stocker dans la session et pas en base ?** C'est suffisant pour un CTF. La session expire avec le navigateur, ce qui est le comportement voulu.

```js
const checkFlag = async (req, res) => {
    if (!req.session?.flagUnlocked) {
        return res.status(403).json({ error: "Zone flag verrouillée. Token requis." });
    }
    // ... validation du code département → flag
};
```

Le double verrou : d'abord `flagUnlocked` en session, ensuite la bonne réponse.

---

## Fichier 4 : `frontend/assets/JS/flag.js` — le piège de la console

C'est ici que réside l'aspect **pédagogique principal**.

### Récupération du token

```js
// Quand le joueur clique "Vérifier le report" :
const data = await fetch(`/phish/result/${encodeURIComponent(reportId)}`).then(r => r.json());

// Si success :
window._phishToken = data.token;   // ← token visible en console navigateur
showPhishMessage('Token récupéré. Utilise window._phishToken dans la console pour /flag/unlock.', true);
```

Le token est **intentionnellement exposé dans `window._phishToken`** pour forcer le joueur à ouvrir les DevTools. Le message lui indique clairement comment procéder.
 
### Ce que le joueur doit faire en console

```js
// Dans la console du navigateur (F12) :
await fetch('/flag/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: window._phishToken })
});
```

### Polling du statut

```js
statusPollInterval = setInterval(refreshStatus, 3000);
```

Le front interroge `/flag/status` toutes les 3 secondes pour détecter si `flagUnlocked` passe à `true` et mettre à jour l'UI sans rechargement.

---

