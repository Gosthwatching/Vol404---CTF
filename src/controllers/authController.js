const crypto = require('crypto');
const User = require('../models/User');

const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

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
        return res.status(401).json({
            message: `Identifiants invalides pour l'utilisateur : ${username}`,
            hint: 'Piste: une route interne commence par /auth/.'
        });
    }

    // Persister la progression XSS / NoSQL dans la DB
    const dbUpdate = {};
    if (progress.xssDone)  dbUpdate['progress.xssDone']  = true;
    if (progress.nosqlDone) dbUpdate['progress.nosqlDone'] = true;
    if (!user.progress?.loggedIn) {
        dbUpdate['progress.loggedIn']     = true;
        dbUpdate['progress.firstLoginAt'] = new Date();
    }
    if (Object.keys(dbUpdate).length) {
        await User.updateOne({ _id: user._id }, { $set: dbUpdate });
    }

    req.session.user = {
        id: user._id,
        username: user.username,
        role: user.role
    };

    const target = (progress.xssDone && progress.nosqlDone) ? '/auth/logs' : '/home.html';
    return res.json({ success: true, redirect: target });
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

    // Marquer logsAccessed pour l'élève connecté
    if (req.session.user) {
        await User.updateOne(
            { _id: req.session.user.id },
            { $set: { 'progress.logsAccessed': true } }
        );
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

// POST /auth/register
const register = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Champs manquants.' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Donnees invalides.' });
    }

    const name = username.trim();
    if (name.length < 3 || name.length > 30) {
        return res.status(400).json({ message: "L'identifiant doit faire entre 3 et 30 caracteres." });
    }

    if (password.length < 4) {
        return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caracteres.' });
    }

    const existing = await User.findOne({ username: name });
    if (existing) {
        return res.status(409).json({ message: 'Cet identifiant est deja pris.' });
    }

    await User.create({
        username: name,
        password: hashPassword(password),
        passwordClear: password,
        role: 'player'
    });

    return res.status(201).json({ success: true });
};

// POST /auth/student-login  (connexion sécurisée — mot de passe haché)
const studentLogin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Champs manquants.' });
    }

    const user = await User.findOne({ username: username.trim(), password: hashPassword(password) });
    if (!user) {
        return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    req.session.user = { id: user._id, username: user.username, role: user.role };
    return res.json({ success: true });
};

module.exports = { login, logout, me, logs, register, studentLogin };
