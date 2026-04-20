vol404-ctf/
├── frontend/          ← FRONT
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── gate.html
│   └── css/style.css
│
├── src/               ← Back
│   ├── server.js                  ← point d'entrée, config Express
│   │
│   ├── models/                    ← M : données + logique BDD
│   │   ├── User.js
│   │   └── Ticket.js
│   │
│   ├── views/                     ← V : pages HTML (ou moteur de template)
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── gate.html
│   │   └── css/style.css
│   │
│   ├── controllers/               ← C : logique métier
│   │   ├── authController.js      (login, logout, session)
│   │   ├── ticketController.js    (recherche, vol de billet, QR code)
│   │   ├── gateController.js      (validation token, affichage message chiffré)
│   │   └── flagController.js      (validation département → flag)
│   │
│   ├── routes/                    ← routage uniquement, appelle les controllers
│   │   ├── auth.js
│   │   ├── tickets.js
│   │   ├── gate.js
│   │   └── flag.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js      (vérif session, accès protégé)
│   │
│   └── utils/
│       ├── vigenere.js
│       └── qth.js
│
├── seed/
│   └── seed.js                    ← peuple la BDD (users + tickets)
│
├── .env
├── package.json
└── docker-compose.yml