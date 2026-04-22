const User = require('../models/User');

const ensureAttackProgress = (req) => {
    if (!req.session.attackProgress) {
        req.session.attackProgress = {
            xssDone: false,
            nosqlDone: false
        };
    }
    return req.session.attackProgress;
};

const isLikelyXssPayload = (value) => {
    if (typeof value !== 'string') return false;
    return /<[^>]+>|onerror\s*=|<script|javascript:/i.test(value);
};

const isLikelyNoSqlInjection = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.keys(value).some((k) => k.startsWith('$'));
};

// POST /auth/login
// ⚠️ CTF — FAILLES INTENTIONNELLES :
//   1. NoSQL Injection : password est passé tel quel dans la requête Mongoose
//      → payload : { "username": "alice", "password": { "$ne": "" } }
//   2. XSS réfléchi  : le username est inclus sans échappement dans le message d'erreur
//      → payload username : <img src=x onerror=alert(document.cookie)>
const login = async (req, res) => {
    const { username, password } = req.body;
    const progress = ensureAttackProgress(req);

    if (isLikelyXssPayload(username)) {
        progress.xssDone = true;
    }

    if (isLikelyNoSqlInjection(password)) {
        progress.nosqlDone = true;
    }

    if (!username || !password) {
        return res.status(400).json({ message: 'Champs manquants.' });
    }

    // FAILLE NoSQL : passwordClear est comparé sans valider que password est bien une string
    // Un attaquant peut envoyer { "password": { "$ne": "" } } pour contourner l'auth
    const user = await User.findOne({ username: username, passwordClear: password });

    if (!user) {
        // FAILLE XSS : username reflété sans échappement HTML dans la réponse
        return res.status(401).json({ message: `Identifiants invalides pour l'utilisateur : ${username}` });
    }

    req.session.user = {
        id: user._id,
        username: user.username,
        role: user.role
    };

    return res.json({ success: true, redirect: '/dashboard.html' });
};

// GET /auth/logs
// L'accès aux logs admin est débloqué uniquement si les 2 injections ont été tentées
const logs = async (req, res) => {
    const progress = ensureAttackProgress(req);
    if (!progress.xssDone || !progress.nosqlDone) {
        return res.status(403).json({
            error: 'Acces refuse. Les traces admin necessitent XSS + NoSQL injection.',
            progress
        });
    }

    const alice = await User.findOne({ username: 'alice' });
    if (!alice) {
        return res.status(404).json({ error: 'Utilisateur admin introuvable.' });
    }

    return res.json({
        progress,
        logs: [
            `[AUTH] user=${alice.username} role=${alice.role}`,
            `[AUTH] clear_password=${alice.passwordClear}`
        ]
    });
};

// POST /auth/logout
const logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
};

// GET /auth/me
const me = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non connecté.' });
    }
    return res.json(req.session.user);
};

module.exports = { login, logout, me, logs };
