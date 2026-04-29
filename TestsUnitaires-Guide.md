# Guide des Tests Unitaires - TP CTF Vol 404

Ce guide explique comment tester le code du projet, pourquoi chaque test est écrit ainsi,
et où placer chaque fichier de test.

---

## 1) Outils utilisés

### Jest

Framework de test principal pour Node.js.

```powershell
npm install --save-dev jest supertest mongodb-memory-server
```

- **jest** : moteur de test (assertions, mocks, runner)
- **supertest** : simule des requêtes HTTP sans vrai réseau
- **mongodb-memory-server** : démarre un MongoDB en mémoire pendant les tests

### Configurer Jest dans package.json

```json
{
  "scripts": {
    "test": "jest --runInBand"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

- `--runInBand` : exécute les tests un par un (important avec MongoDB)
- `testMatch` : cherche tous les fichiers `.test.js` dans le dossier `tests/`

---

## 2) Structure des dossiers de tests

```
Vol404---CTF/
├── src/
│   ├── utils/
│   │   ├── vigenere.js
│   │   └── scanSessions.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── flagController.js
│   └── ...
├── tests/                        ← dossier à créer
│   ├── utils/
│   │   ├── vigenere.test.js      ← tests unitaires purs
│   │   └── scanSessions.test.js  ← tests unitaires purs
│   ├── controllers/
│   │   ├── auth.test.js          ← tests d'intégration
│   │   └── flag.test.js          ← tests d'intégration
│   └── setup.js                  ← configuration partagée (Mongo mémoire)
```

---

## 3) Tests unitaires purs

Un test unitaire teste **une seule fonction isolée**, sans base de données, sans serveur.

---

### 3.1) `tests/utils/vigenere.test.js`

Cible : [src/utils/vigenere.js](src/utils/vigenere.js)

```js
const { vigenereEncode, vigenereDecode } = require('../../src/utils/vigenere');

// describe() regroupe les tests d'un même sujet
describe('vigenereEncode', () => {

  // test() ou it() décrit un cas précis
  test('encode ORY avec la clé DEPARTEMENT94 et retourne RVN', () => {
    // La clé est filtrée (chiffres enlevés) → devient DEPARTEMENT
    // O (14) + D (3)  = R (17)
    // R (17) + E (4)  = V (21)
    // Y (24) + P (15) = N (13) ... modulo 26
    expect(vigenereEncode('DEPARTEMENT94', 'ORY')).toBe('RVN');
    //      ↑ la fonction             ↑ entrée  ↑ résultat attendu
  });

  test('retourne une chaine vide si le texte est vide', () => {
    expect(vigenereEncode('ORY', '')).toBe('');
  });

  test('ignore les caractères non alphabétiques dans le texte', () => {
    // Le chiffre "4" dans le texte est conservé tel quel
    const result = vigenereEncode('ORY', 'A4B');
    expect(result).toContain('4');
  });
});

describe('vigenereDecode', () => {

  test('décode RVN avec la clé DEPARTEMENT et retourne ORY', () => {
    expect(vigenereDecode('DEPARTEMENT', 'RVN')).toBe('ORY');
  });

  test('encode puis décode → retrouve le texte original', () => {
    const texte = 'BONJOUR';
    const cle   = 'SECRET';
    const code  = vigenereEncode(cle, texte);
    // Le décodage de ce qui a été encodé doit redonner l'original
    expect(vigenereDecode(cle, code)).toBe(texte);
  });
});
```

**Pourquoi ces tests :**
- `vigenereEncode('DEPARTEMENT94', 'ORY')` c'est exactement l'appel fait dans `gateController.js`
- Si quelqu'un modifie la fonction, le test casse immédiatement
- Le test encode/décode garantit la cohérence des deux fonctions ensemble

---

### 3.2) `tests/utils/scanSessions.test.js`

Cible : [src/utils/scanSessions.js](src/utils/scanSessions.js)

```js
const {
  createScanSession,
  getScanSession,
  markScanAsCompleted
} = require('../../src/utils/scanSessions');

describe('createScanSession', () => {

  test('retourne un scanId unique en hexadécimal', () => {
    const scanId = createScanSession({ ticketToken: 'abc', userId: '123' });

    // Un hex de 16 bytes = 32 caractères
    expect(typeof scanId).toBe('string');
    expect(scanId).toHaveLength(32);
    // Vérifie que c'est bien de l'hex
    expect(scanId).toMatch(/^[0-9a-f]+$/);
  });

  test('deux sessions créées ont des scanId différents', () => {
    const id1 = createScanSession({ ticketToken: 'tok1', userId: 'u1' });
    const id2 = createScanSession({ ticketToken: 'tok2', userId: 'u2' });

    expect(id1).not.toBe(id2);
  });

  test('la session créée est récupérable via getScanSession', () => {
    const scanId = createScanSession({ ticketToken: 'tok', userId: 'u1' });
    const session = getScanSession(scanId);

    expect(session).not.toBeNull();
    expect(session.ticketToken).toBe('tok');
    expect(session.userId).toBe('u1');
    // Par défaut, pas encore scanné
    expect(session.scanned).toBe(false);
  });
});

describe('getScanSession', () => {

  test('retourne null pour un scanId inexistant', () => {
    const result = getScanSession('scanid-qui-nexiste-pas');
    expect(result).toBeNull();
  });
});

describe('markScanAsCompleted', () => {

  test('passe scanned à true et enregistre scannedAt', () => {
    const scanId  = createScanSession({ ticketToken: 'tok', userId: 'u1' });
    const session = markScanAsCompleted(scanId);

    expect(session.scanned).toBe(true);
    // scannedAt est un timestamp numérique
    expect(typeof session.scannedAt).toBe('number');
  });

  test('retourne null si le scanId est inconnu', () => {
    const result = markScanAsCompleted('id-inconnu');
    expect(result).toBeNull();
  });
});
```

**Pourquoi ces tests :**
- `createScanSession` génère un ID aléatoire : on vérifie le format (hex 32 chars)
- L'unicité garantit qu'on ne peut pas confondre deux sessions
- `markScanAsCompleted` est critique : c'est lui qui débloque la redirection PC

---

## 4) Tests d'intégration (routes HTTP)

Un test d'intégration envoie de vraies requêtes HTTP à l'app Express et vérifie les réponses.
Il nécessite un MongoDB en mémoire pour ne pas toucher la vraie base.

---

### 4.1) `tests/setup.js`

Fichier partagé qui démarre/arrête MongoDB mémoire pour tous les tests d'intégration.

```js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// beforeAll : exécuté une fois avant tous les tests du fichier
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri   = mongoServer.getUri();
  // On connecte Mongoose à ce Mongo temporaire
  await mongoose.connect(uri);
});

// afterAll : exécuté une fois après tous les tests du fichier
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// afterEach : après chaque test, on vide les collections
// → chaque test repart d'une base propre
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

---

### 4.2) `tests/controllers/flag.test.js`

Cible : `POST /flag` dans [src/controllers/flagController.js](src/controllers/flagController.js)

```js
require('../setup');                          // Mongo mémoire
const request = require('supertest');
const app     = require('../../src/server'); // l'app Express

describe('POST /flag', () => {

  test('retourne le flag correct pour le code 94', async () => {
    // request(app) crée un client HTTP virtuel
    // .post('/flag') envoie une requête POST
    const res = await request(app)
      .post('/flag')
      .send({ code: 94 });               // corps JSON

    expect(res.status).toBe(200);
    // Le flag attendu pour le département 94 (Val-de-Marne → ORY)
    expect(res.body.flag).toBe('CTF{ORY_boarding_complete}');
  });

  test('retourne 400 pour un code inconnu', async () => {
    const res = await request(app)
      .post('/flag')
      .send({ code: 99 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('retourne 400 si code absent', async () => {
    const res = await request(app)
      .post('/flag')
      .send({});

    expect(res.status).toBe(400);
  });

  test('retourne des flags différents selon le département', async () => {
    const res13 = await request(app).post('/flag').send({ code: 13 });
    const res69 = await request(app).post('/flag').send({ code: 69 });

    expect(res13.body.flag).toBe('CTF{MRS_boarding_complete}');
    expect(res69.body.flag).toBe('CTF{LYS_boarding_complete}');
  });
});
```

**Pourquoi ces tests :**
- Vérifier que le flag exact est bien `CTF{ORY_boarding_complete}` et pas autre chose
- Vérifier que les mauvais codes sont rejetés proprement
- Vérifier la cohérence de tous les aéroports définis dans le contrôleur

---

### 4.3) `tests/controllers/auth.test.js`

Cible : `POST /auth/login` dans [src/controllers/authController.js](src/controllers/authController.js)

```js
require('../setup');
const request  = require('supertest');
const app      = require('../../src/server');
const User     = require('../../src/models/User');
const crypto   = require('crypto');

// Fonction helper pour hasher comme le seed
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// beforeEach : crée un user de test avant chaque test
beforeEach(async () => {
  await User.create({
    username: 'alice',
    password: sha256('monpassword'),
    passwordClear: 'monpassword',
    role: 'admin'
  });
});

describe('POST /auth/login', () => {

  test('login valide retourne success et un redirect', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'monpassword' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.redirect).toBeDefined();
  });

  test('mauvais mot de passe retourne 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'mauvais' });

    expect(res.status).toBe(401);
  });

  test('injection NoSQL { $ne: "" } bypass le mot de passe', async () => {
    // C'est la FAILLE INTENTIONNELLE du CTF
    // Le mot de passe { $ne: "" } est passé directement à Mongoose
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: { $ne: '' } });

    // La faille fait passer l'auth → 200 attendu
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('payload XSS est détecté et marque xssDone dans la session', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: '<img src=x onerror=alert(1)>', password: 'wrong' });

    // Le username invalide retourne 401 mais la session enregistre xssDone
    expect(res.status).toBe(401);
    // Le message d'erreur reflète le username (XSS réfléchi intentionnel)
    expect(res.body.message).toContain('<img src=x onerror=alert(1)>');
  });

  test('champs manquants retourne 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'alice' }); // pas de password

    expect(res.status).toBe(400);
  });
});
```

**Pourquoi ces tests :**
- Confirmer que la faille NoSQL est bien présente (c'est voulu dans ce CTF)
- Confirmer que le XSS réfléchi fonctionne (c'est aussi voulu)
- Vérifier que les cas normaux (bon/mauvais mot de passe) marchent

---

## 5) Lancer les tests

```powershell
# Tous les tests
npm test

# Un seul fichier
npx jest tests/utils/vigenere.test.js

# Avec couverture de code
npx jest --coverage
```

La couverture de code (`--coverage`) indique le pourcentage de lignes testées.

---

## 6) Résumé des fichiers à créer

| Fichier | Ce qu'il teste | Type |
|---|---|---|
| `tests/setup.js` | MongoDB mémoire partagé | Configuration |
| `tests/utils/vigenere.test.js` | `vigenereEncode`, `vigenereDecode` | Unitaire |
| `tests/utils/scanSessions.test.js` | `createScanSession`, `getScanSession`, `markScanAsCompleted` | Unitaire |
| `tests/controllers/flag.test.js` | `POST /flag` | Intégration |
| `tests/controllers/auth.test.js` | `POST /auth/login` | Intégration |
