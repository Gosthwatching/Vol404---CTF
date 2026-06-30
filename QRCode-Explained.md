# QR Code — Documentation complète

Ce document couvre l'intégralité de la mécanique QR code du projet Vol404 CTF,
de la création du token en base jusqu'à la redirection automatique du PC après scan.

---

## Vue d'ensemble

```
seed.js          →  qrToken (permanent, stocké en MongoDB)
billetController →  scanId  (éphémère, en mémoire)
                 →  URL encodée dans le QR : /gate/scan/<scanId>?token=<qrToken>
                 →  QRCode.toDataURL()     → image PNG base64
billet.html      →  affiche l'image + poll toutes les 1,5s
téléphone        →  scanne le QR → GET /gate/scan/<scanId>?token=<qrToken>
gateController   →  marque scanId comme "scanné" → renvoie le payload gate au téléphone
billet.html poll →  détecte scanned:true → redirige le PC vers gate.html
```

---

## 1. Le `qrToken` — permanent, stocké en base

**Fichier :** `seed/seed.js`

```js
const qrToken = crypto.randomBytes(16).toString('hex');

await Ticket.findOneAndUpdate(
    { userId: user._id },
    { $set: { qrToken: qrToken, /* ... autres champs billet ... */ } },
    { upsert: true, new: true }
);
```

- Généré **une seule fois** au seeding de la base
- Stocké dans la collection `billets` (modèle `Billet.js`)
- Sert de clé pour retrouver le billet dans MongoDB lors du scan
- **Ne change jamais** (même si le serveur redémarre)

**Modèle MongoDB :** `src/models/Billet.js`

```js
qrToken: {
    type: String,
    required: true
}
```

---

## 2. Le `scanId` — éphémère, en mémoire

**Fichier :** `src/utils/scanSessions.js`

```js
const SCAN_TTL_MS = 6 * 60 * 60 * 1000; // 6h par défaut (env: SCAN_TTL_MS)
const scanSessions = new Map();           // stockage en mémoire RAM

const createScanSession = ({ ticketToken, userId }) => {
    purgeExpired();                               // nettoie les sessions expirées
    const scanId = crypto.randomBytes(16).toString('hex');
    scanSessions.set(scanId, {
        scanId,
        ticketToken,   // = qrToken du billet
        userId,
        scanned: false,
        createdAt: Date.now(),
        scannedAt: null
    });
    return scanId;
};
```

- Créé **à chaque appel** de `GET /billets/my` → le QR change à chaque rechargement
- Lié au `qrToken` permanent via `ticketToken`
- Expiré automatiquement après 6h (purge au prochain accès)

### Fonctions utilitaires

| Fonction | Rôle |
|---|---|
| `createScanSession()` | Crée un nouveau `scanId`, retourne son ID |
| `getScanSession(scanId)` | Lit une session (purge les expirées au passage) |
| `markScanAsCompleted(scanId)` | Passe `scanned = true`, note `scannedAt` |
| `markScanByToken(scanId, token)` | Fallback : restaure une session expirée depuis le token URL |

---

## 3. Construction de l'URL et de l'image QR

**Fichier :** `src/controllers/billetController.js`

### Chemin encodé dans le QR

```js
const buildScanPath = (scanId, ticketToken) => {
    const token = encodeURIComponent(ticketToken);
    return `/gate/scan/${scanId}?token=${token}`;
};
```

### Résolution de l'URL publique

Le serveur détermine automatiquement l'URL à encoder selon ce ordre de priorité :

```
1. URL de la requête elle-même   (si domaine public / tunnel ngrok)
2. process.env.PUBLIC_BASE_URL   (configuré dans .env)
3. IP LAN détectée (os.networkInterfaces())
4. localhost (fallback)
```

```js
const buildPublicScanUrl = (req, scanId, ticketToken) => {
    const { proto, host } = getRequestProtoAndHost(req);
    const scanPath = buildScanPath(scanId, ticketToken);

    if (!isNonPublicHost(host)) {
        return `${proto}://${host}${scanPath}`;      // tunnel/domaine
    }
    const envBaseUrl = normalizeBaseUrl(process.env.PUBLIC_BASE_URL);
    if (envBaseUrl) {
        return `${envBaseUrl}${scanPath}`;            // PUBLIC_BASE_URL
    }
    const lanIp = getPreferredLanIp();
    if (lanIp) {
        return `${proto}://${lanIp}:${port}${scanPath}`; // IP LAN
    }
    return `${proto}://${host}${scanPath}`;           // fallback localhost
};
```

> `isNonPublicHost` retourne `true` pour `localhost`, `127.0.0.1` et les IPs Docker bridge `172.16-31.x`.

### Génération de l'image

```js
const buildTicketResponse = async (ticket, scanUrls, scanId) => {
    const qrDataURL = await QRCode.toDataURL(scanUrls.scanUrl);
    // qrDataURL = "data:image/png;base64,iVBORw0KGgo..."

    return {
        /* champs billet... */
        qr: qrDataURL,          // image PNG base64 → affichée dans <img>
        scanId,                 // pour le polling côté PC
        scanUrl: scanUrls.scanUrl,
        scanUrlLocal: scanUrls.scanUrlLocal,
        scanUrlPublic: scanUrls.scanUrlPublic
    };
};
```

---

## 4. Affichage du QR côté navigateur

**Fichier :** `frontend/billet.html`

```html
<!-- Conteneur caché au départ -->
<div class="ticket-qr-slot">
    <img id="ticket-qr" alt="QR code d'embarquement" style="display:none">
</div>
```

```js
fetch('/billets/my', { credentials: 'include' })
    .then(r => r.json())
    .then((ticket) => {
        // Injection de l'image base64
        const qrImg = document.getElementById('ticket-qr');
        qrImg.src = ticket.qr;          // data:image/png;base64,...
        qrImg.style.display = '';       // rend visible

        // Démarrage du polling de scan
        watchScanStatus(ticket.scanId, ticket.qrToken);
    });
```

---

## 5. Polling — surveillance du scan côté PC

**Fichier :** `frontend/billet.html` — fonction `watchScanStatus`

```js
const watchScanStatus = (scanId, qrToken) => {
    // Polling toutes les 1,5 secondes
    pollHandle = setInterval(() => {
        fetch(`/billets/scan-status/${encodeURIComponent(scanId)}`, { credentials: 'include' })
            .then(r => r.json())
            .then((payload) => {
                if (payload.scanned) {
                    stopPolling();
                    window.location.href = payload.redirect;
                    // → /gate.html?scanId=...&token=...
                }
            });
    }, 1500);

    // Fallback automatique après 30s (sans clic utilisateur)
    waitTimeoutHandle = setTimeout(() => {
        stopPolling();
        window.location.href = `/gate.html?scanId=${scanId}&token=${qrToken}`;
    }, 30000);
};
```

**Route correspondante :** `GET /billets/scan-status/:scanId`

```js
const getScanStatus = async (req, res) => {
    const session = getScanSession(scanId);
    if (!session)          return res.json({ scanned: false, stale: true });
    if (!session.scanned)  return res.json({ scanned: false });

    return res.json({
        scanned: true,
        redirect: `/gate.html?scanId=${scanId}&token=${session.ticketToken}`
    });
};
```

---

## 6. Réception du scan côté téléphone

**Fichier :** `src/controllers/gateController.js`

**Route :** `GET /gate/scan/:scanId?token=<qrToken>`

```js
const scanGate = async (req, res) => {
    const { scanId } = req.params;
    const tokenHint = req.query.token;

    // 1. Marque la session comme scannée
    let session = markScanAsCompleted(scanId);

    // 2. Cherche le billet via le token de session
    let ticket = session ? await Ticket.findOne({ qrToken: session.ticketToken }) : null;

    // 3. Fallback si session expirée : utilise le token dans l'URL
    if (!ticket && tokenHint) {
        ticket = await Ticket.findOne({ qrToken: tokenHint });
        if (ticket) session = markScanByToken(scanId, tokenHint);
    }

    // 4. Renvoie le payload gate au téléphone
    return res.json(buildGatePayload(ticket));
};
```

### Payload gate renvoyé

```json
{
  "gate": "B7",
  "flightCode": "AF404",
  "message": "RVN",
  "hint": "QTH Locator : JN18ER",
  "indice": "La cle survole la banlieue parisienne...",
  "opsNote": "Acces gate confirme...",
  "validationRequired": true,
  "validationMethod": "Validation manuelle requise via jeton temporaire d override.",
  "validationPortal": "/flag.html",
  "nextStep": "Poursuivez vers le portail de validation..."
}
```

> `RVN` est `ORY` encodé en Vigenère avec la clé `DEPARTEMENT94` — voir `src/utils/vigenere.js`.

---

## 8. Récapitulatif des fichiers

| Fichier | Responsabilité QR |
|---|---|
| `seed/seed.js` | Génère `qrToken` (permanent, en base) |
| `src/models/Billet.js` | Schéma MongoDB, champ `qrToken` |
| `src/utils/scanSessions.js` | CRUD des sessions éphémères (`scanId`) en mémoire |
| `src/controllers/billetController.js` | Construit l'URL, génère l'image PNG base64 via `qrcode` |
| `src/controllers/gateController.js` | Reçoit le scan téléphone, marque scanné, renvoie payload |
| `frontend/billet.html` | Affiche le QR, poll toutes les 1,5s, redirige le PC |

---

