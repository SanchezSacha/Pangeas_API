const { getUserById } = require('../models/userModel');

module.exports = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentification requise.'
        });
    }

    getUserById(req.session.user.id, (error, user) => {
        if (error) return next(error);

        const isActive = user && user.is_active !== 0 && !['disabled', 'anonymized', 'deleted'].includes(user.status);
        if (!isActive) {
            return req.session.destroy(() => res.status(401).json({
                success: false,
                message: 'Session invalide ou compte désactivé.'
            }));
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            pseudo: user.pseudo,
            avatar_url: user.avatar_url,
            bio: user.bio,
            role: user.role
        };
        next();
    });
};
