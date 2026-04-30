# Système de suivi de progression — Leaderboard professeur

Ce document explique les fichiers créés ou modifiés pour permettre au prof de suivre la progression des etudiants et d'afficher un classement.

---

## Vue d'ensemble

Chaque action clé d'un élève pendant le CTF est enregistrée en base de données (MongoDB) dans son profil utilisateur. Une route protégée permet ensuite au professeur de consulter un classement en temps réel.

Les étapes trackées, dans l'ordre :

| Étape | Déclencheur |
|---|---|
| Connexion | Premier login réussi |
| XSS | Payload XSS détecté dans le champ username |
| NoSQL Injection | Payload `$ne` détecté dans le champ password |
| Logs admin | Accès à `GET /auth/logs` réussi |
| Flag trouvé | Soumission d'un code correct sur `POST /flag` |

---

## Fichiers modifiés

### `src/models/User.js`

Ajout d'un champ `progress` dans le schéma Mongoose de l'utilisateur.

```js
progress: {
    loggedIn:      Boolean,   // premier login réussi
    xssDone:       Boolean,   // tentative XSS détectée
    nosqlDone:     Boolean,   // injection NoSQL détectée
    logsAccessed:  Boolean,   // logs admin consultés
    flagFound:     Boolean,   // flag soumis correctement
    firstLoginAt:  Date,      // horodatage du premier login
    flagFoundAt:   Date       // horodatage de la validation du flag
}
```

Ce champ est initialisé à `false` / `null` par défaut et mis à jour au fur et à mesure par les controllers.

---

### `src/controllers/authController.js`

Trois modifications :

1. **Après un login réussi** — sauvegarde en DB si XSS ou NoSQL ont été tentés, et marque `loggedIn` + `firstLoginAt` lors du tout premier login.

2. **Route `GET /auth/logs`** — quand l'élève accède aux logs admin (après avoir fait XSS + NoSQL), `logsAccessed` est passé à `true` dans la DB.

```js
await User.updateOne(
    { _id: req.session.user.id },
    { $set: { 'progress.logsAccessed': true } }
);
```

---

### `src/controllers/flagController.js`

Ajout de la sauvegarde du flag en DB lors d'une soumission correcte.

La condition `$ne: true` évite d'écraser `flagFoundAt` si l'élève soumet plusieurs fois.

```js
await User.updateOne(
    { _id: req.session.user.id, 'progress.flagFound': { $ne: true } },
    { $set: { 'progress.flagFound': true, 'progress.flagFoundAt': new Date() } }
);
```

---

### `src/server.js`

Enregistrement de la nouvelle route admin :

```js
app.use('/admin', require('./routes/admin'));
```

---

### `.env`

Ajout de la variable secrète utilisée pour protéger l'accès au leaderboard :

```
PROF_SECRET=prof-vol404-2026
```

Changer cette valeur pour chaque session CTF.

---

## Nouveaux fichiers

### `src/middleware/profMiddleware.js`

Middleware de protection des routes `/admin/*`.

Vérifie la clé secrète transmise soit via :
- **Header HTTP** : `X-Prof-Key: prof-vol404-2026`
- **Query param** : `?key=prof-vol404-2026`

Si la clé est absente ou incorrecte, la requête est rejetée avec un `403 Accès refusé`.

---

### `src/controllers/leaderboardController.js`

Récupère tous les utilisateurs avec le rôle `player`, calcule leur score (nombre d'étapes validées sur 5) et les trie :

1. Par **score décroissant** (le plus avancé en premier)
2. En cas d'égalité, par **heure de flag croissante** (le plus rapide en premier)

Exemple de réponse :

```json
{
  "total": 3,
  "steps": ["Connexion", "XSS", "NoSQL Injection", "Logs admin", "Flag trouvé"],
  "leaderboard": [
    {
      "rank": 1,
      "username": "bob",
      "score": 5,
      "flagFoundAt": "2026-04-30T10:42:00.000Z",
      "steps": {
        "Connexion": true,
        "XSS": true,
        "NoSQL Injection": true,
        "Logs admin": true,
        "Flag trouvé": true
      }
    },
    {
      "rank": 2,
      "username": "eva",
      "score": 3,
      "flagFoundAt": null,
      "steps": {
        "Connexion": true,
        "XSS": true,
        "NoSQL Injection": true,
        "Logs admin": false,
        "Flag trouvé": false
      }
    }
  ]
}
```

---

### `src/routes/admin.js`

Déclare la route GET `/admin/leaderboard`, protégée par `profMiddleware`.

```
GET /admin/leaderboard?key=prof-vol404-2026
```

---

## Utilisation

### Consulter le classement

```
GET http://localhost:3000/admin/leaderboard?key=prof-vol404-2026
```

Ou avec un header :

```http
GET /admin/leaderboard
X-Prof-Key: prof-vol404-2026
```

### Relancer Docker après modifications

```powershell
docker compose up -d --build
```

Le seed n'a pas besoin d'être rejoué — le champ `progress` est ajouté automatiquement par Mongoose avec des valeurs par défaut.
