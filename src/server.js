require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Needed when running behind reverse proxies/tunnels to get correct host/protocol.
app.set('trust proxy', true);

// Connexion MongoDB
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 } // 1h
}));

// Pages protégées — inaccessibles sans session active
const pagesProtegees = ['/billet.html', '/gate.html', '/flag.html'];
app.use((req, res, next) => {
    if (pagesProtegees.includes(req.path)) {
        if (!req.session.user) {
            return res.redirect('/register.html');
        }
    }
    // Bloquer l'accès direct à index.html sans session
    if (req.path === '/index.html') {
        if (!req.session.user) return res.redirect('/register.html');
    }
    next();
});

// Frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));

// Routes
app.use('/auth',    require('./routes/auth'));
app.use('/billets', require('./routes/billets'));
app.use('/gate',    require('./routes/gate'));
app.use('/flag',    require('./routes/flag'));
app.use('/admin',   require('./routes/admin'));

// Route racine → inscription si pas de session, sinon intro CTF
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    }
    res.redirect('/register.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
