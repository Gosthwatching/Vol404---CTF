const authMiddleware = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login.html');
    }
    next();
};

module.exports = authMiddleware;
