const User = require('../models/User');

// POST /auth/login
// ⚠️ CTF — FAILLES INTENTIONNELLES :
//   1. NoSQL Injection : password est passé tel quel dans la requête Mongoose
//      → payload : { "username": "alice", "password": { "$ne": "" } }
//   2. XSS réfléchi  : le username est inclus sans échappement dans le message d'erreur
//      → payload username : <img src=x onerror=alert(document.cookie)>
const login = async (req, res) => {
    const { username, password } = req.body;

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

module.exports = { login, logout, me };
