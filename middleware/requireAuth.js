const prisma = require('../BDD/prisma');

module.exports = async (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentification requise.'
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.session.user.id },
            select: {
                id: true,
                email: true,
                pseudo: true,
                avatarUrl: true,
                bio: true,
                role: true,
                isActive: true,
                status: true
            }
        });

        if (!user || !user.isActive || user.status !== 'active') {
            return req.session.destroy(() => res.status(401).json({
                success: false,
                message: 'Session invalide ou compte desactive.'
            }));
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            pseudo: user.pseudo,
            avatar_url: user.avatarUrl,
            bio: user.bio,
            role: user.role
        };
        next();
    } catch (error) {
        next(error);
    }
};
