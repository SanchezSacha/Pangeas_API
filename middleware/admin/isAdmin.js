const prisma = require('../../BDD/prisma');

async function isAdmin(req, res, next) {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentification requise.' });

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, isActive: true, status: true }
        });

        if (!user || !user.isActive || user.status !== 'active' || user.role !== 'admin') {
            return res.status(403).json({ message: 'Acces refuse. Reserve aux administrateurs.' });
        }

        req.session.user.role = user.role;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { isAdmin };
