# Guide - Changer le nom de l URL publique

Ce guide explique comment passer d une URL aleatoire Cloudflare a une URL personnalisee pour vos etudiants.

## 1) Cas rapide: URL aleatoire (sans compte Cloudflare)

Commande:

```powershell
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```

Resultat:

- URL du type `https://xxxx.trycloudflare.com`
- Nom non personnalisable
- Peut changer a chaque redemarrage

## 2) Cas pro: URL personnalisee (stable)

Exemple voulu:

- `https://ctf.votre-domaine.fr`

Prerequis:

- Un compte Cloudflare
- Un domaine gere dans Cloudflare (DNS actif)
- cloudflared installe sur votre PC

### Etape A - Authentification cloudflared

```powershell
cloudflared tunnel login
```

Une page web s ouvre pour autoriser cloudflared.

### Etape B - Creer un tunnel nomme

```powershell
cloudflared tunnel create vol404
```

Notez l identifiant du tunnel (TUNNEL_ID).

### Etape C - Associer un sous-domaine DNS

```powershell
cloudflared tunnel route dns vol404 ctf.votre-domaine.fr
```

### Etape D - Creer le fichier de configuration

Fichier: `%USERPROFILE%\.cloudflared\config.yml`

```yaml
tunnel: TUNNEL_ID
credentials-file: C:\Users\VOTRE_USER\.cloudflared\TUNNEL_ID.json

ingress:
  - hostname: ctf.votre-domaine.fr
    service: http://localhost:3000
  - service: http_status:404
```

Remplacez:

- `TUNNEL_ID`
- `VOTRE_USER`
- `ctf.votre-domaine.fr`

### Etape E - Lancer le tunnel nomme

```powershell
cloudflared tunnel run vol404
```

Resultat:

- URL stable et choisie: `https://ctf.votre-domaine.fr`
- Vous pouvez la partager a chaque cours sans changement

## 3) Verification

1. Ouvrez l URL personnalisee depuis un autre reseau (4G par exemple)
2. Verifiez que l accueil charge
3. Ouvrez `billet.html` et confirmez que le QR encode bien le domaine personnalise

## 4) Conseils pour le TP

- Gardez le tunnel actif pendant toute la seance
- Si vous utilisez l URL personnalisee, mettez aussi `PUBLIC_BASE_URL` dans `.env`:

```env
PUBLIC_BASE_URL=https://ctf.votre-domaine.fr
```

Puis redemarrez l app.
