const { getUserById } = require('../../models/userModel');

function isAdmin(req, res, next) {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentification requise.' });

    getUserById(userId, (error, user) => {
        if (error) return next(error);

        const isActive = user && user.is_active !== 0 && !['disabled', 'anonymized', 'deleted'].includes(user.status);
        if (!isActive || user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
        }

        req.session.user.role = user.role;
        next();
    });
}

module.exports = { isAdmin };
