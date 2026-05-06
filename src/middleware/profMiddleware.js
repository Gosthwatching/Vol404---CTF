// Middleware: verifie que l utilisateur a un role autorise cote prof/admin.
// Middleware professeur â€” protÃ¨ge les routes /admin/*
// AccÃ¨s via header  X-Prof-Key: <PROF_SECRET>
// ou query param   ?key=<PROF_SECRET>
const profMiddleware = (req, res, next) => {
    const secret = process.env.PROF_SECRET;
    if (!secret) {
        return res.status(500).json({ error: 'PROF_SECRET non configurÃ©.' });
    }

    const provided = req.headers['x-prof-key'] || req.query.key;
    if (!provided || provided !== secret) {
        return res.status(403).json({ error: 'AccÃ¨s refusÃ©.' });
    }

    next();
};

module.exports = profMiddleware;

