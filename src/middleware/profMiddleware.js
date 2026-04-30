// Middleware professeur — protège les routes /admin/*
// Accès via header  X-Prof-Key: <PROF_SECRET>
// ou query param   ?key=<PROF_SECRET>
const profMiddleware = (req, res, next) => {
    const secret = process.env.PROF_SECRET;
    if (!secret) {
        return res.status(500).json({ error: 'PROF_SECRET non configuré.' });
    }

    const provided = req.headers['x-prof-key'] || req.query.key;
    if (!provided || provided !== secret) {
        return res.status(403).json({ error: 'Accès refusé.' });
    }

    next();
};

module.exports = profMiddleware;
