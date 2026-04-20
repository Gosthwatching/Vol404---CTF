const crypto = require('crypto');
const User = require('../models/User');

const hashPassword = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

// POST /auth/login
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Champs manquants.' });
    }

    // ⚠️ FAILLE INTENTIONNELLE : pas de validation du type → NoSQL Injection possible
    const user = await User.findOne({ username: username, password: hashPassword(password) });

    if (!user) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
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
