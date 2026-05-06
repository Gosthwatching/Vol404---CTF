// Middleware: verifie qu un utilisateur est connecte avant d acceder a la route.
const authMiddleware = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login.html');
    }
    next();
};

module.exports = authMiddleware;

