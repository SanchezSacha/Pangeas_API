const prisma = require('../../BDD/prisma');
const { anonymizeAccount } = require('../accountModel');

const getAllUsers = async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            pseudo: true,
            email: true,
            role: true,
            status: true,
            isActive: true,
            anonymizedAt: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
            pointAccount: {
                select: {
                    totalPoints: true,
                    availablePoints: true
                }
            },
            _count: {
                select: {
                    donations: true,
                    favorites: true,
                    visits: {
                        where: { status: 'visited' }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        role: user.role,
        status: user.status,
        is_active: user.isActive,
        anonymized_at: user.anonymizedAt,
        deleted_at: user.deletedAt,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        favorites_count: user._count.favorites,
        donations_count: user._count.donations,
        total_points: user.pointAccount?.totalPoints || 0,
        available_points: user.pointAccount?.availablePoints || 0,
        visited_places_count: user._count.visits
    }));
};

const getUserDetailsById = async (userId) => {
    const normalizedUserId = Number(userId);
    const user = await prisma.user.findUnique({
        where: { id: normalizedUserId },
        select: {
            id: true,
            pseudo: true,
            email: true,
            bio: true,
            avatarUrl: true,
            role: true,
            cguAccepted: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
            status: true,
            anonymizedAt: true,
            deletedAt: true,
            visits: {
                where: { status: 'visited' },
                select: { placeId: true }
            },
            stats: true,
            pointAccount: true,
            favorites: {
                select: { id: true }
            },
            donations: {
                select: { id: true }
            },
            settings: true
        }
    });

    if (!user) {
        throw new Error('Utilisateur non trouve');
    }

    return {
        id: user.id,
        pseudo: user.pseudo,
        email: user.email,
        bio: user.bio,
        avatar_url: user.avatarUrl,
        role: user.role,
        cgu_accepted: user.cguAccepted,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        is_active: user.isActive,
        status: user.status,
        anonymized_at: user.anonymizedAt,
        deleted_at: user.deletedAt,
        visited_places: user.visits.map(visit => ({ place_id: visit.placeId })),
        stats: user.stats || null,
        points: user.pointAccount || null,
        favorites_count: user.favorites.length,
        donations_count: user.donations.length,
        settings: user.settings || null
    };
};

const updateUserById = async (userId, { pseudo, email, role }) => {
    return prisma.user.update({
        where: { id: Number(userId) },
        data: { pseudo, email, role }
    });
};

const deleteUserAndData = (userId) => anonymizeAccount(userId);

module.exports = {
    getAllUsers,
    getUserDetailsById,
    updateUserById,
    deleteUserAndData
};
