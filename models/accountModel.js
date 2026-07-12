const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const prisma = require('../BDD/prisma');
const { getPlacesCollection } = require('../BDD/mongo');

const DEFAULT_AVATAR_URL = '/img-avatar.jpg';

const buildAnonymousUserData = (userId, status) => {
    const now = new Date();
    const anonymousSuffix = `${userId}-${crypto.randomBytes(6).toString('hex')}`;

    return {
        pseudo: `Utilisateur anonymise ${userId}`,
        email: `anonymized-${anonymousSuffix}@pangeas.local`,
        passwordHash: crypto.randomBytes(64).toString('hex'),
        bio: null,
        avatarUrl: DEFAULT_AVATAR_URL,
        cguAccepted: false,
        isActive: false,
        status,
        isEmailVerified: false,
        anonymizedAt: now,
        deletedAt: status === 'deleted' ? now : null,
        lastLoginAt: null,
        loginStreakCount: 0,
        lastStreakDate: null
    };
};

const anonymizeUser = async (userId, status = 'anonymized') => {
    const normalizedUserId = Number(userId);

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { id: normalizedUserId },
            select: { id: true, avatarUrl: true, status: true }
        });

        if (!user) {
            const error = new Error('Utilisateur introuvable');
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        await Promise.all([
            tx.userSettings.deleteMany({ where: { userId: normalizedUserId } }),
            tx.passwordResetToken.deleteMany({ where: { userId: normalizedUserId } }),
            tx.syncEvent.deleteMany({ where: { userId: normalizedUserId } }),
            tx.internalNotification.deleteMany({ where: { userId: normalizedUserId } }),
            tx.pointAccount.updateMany({
                where: { userId: normalizedUserId },
                data: { availablePoints: 0 }
            }),
            tx.userVisit.updateMany({
                where: { userId: normalizedUserId },
                data: {
                    clientEventId: null,
                    gpsAccuracyM: null,
                    validationLat: null,
                    validationLng: null
                }
            }),
            tx.donation.updateMany({
                where: { userId: normalizedUserId },
                data: { message: null }
            }),
            tx.couponCode.updateMany({
                where: { assignedToUserId: normalizedUserId },
                data: { assignedToUserId: null, assignedAt: null }
            })
        ]);

        const anonymizedUser = await tx.user.update({
            where: { id: normalizedUserId },
            data: buildAnonymousUserData(normalizedUserId, status)
        });

        return {
            user: anonymizedUser,
            previousAvatarUrl: user.avatarUrl
        };
    });
};

const anonymizeUserData = async (userId) => anonymizeUser(userId, 'anonymized');

const anonymizeAccount = async (userId) => anonymizeUser(userId, 'deleted');

const getUserDataForExport = async (userId) => {
    const normalizedUserId = Number(userId);

    const [user, stats, settings, favorites, visits] = await Promise.all([
        prisma.user.findUnique({
            where: { id: normalizedUserId },
            select: {
                id: true,
                pseudo: true,
                email: true,
                bio: true,
                avatarUrl: true,
                cguAccepted: true,
                status: true,
                isActive: true,
                anonymizedAt: true,
                deletedAt: true,
                createdAt: true
            }
        }),
        prisma.userStats.findUnique({ where: { userId: normalizedUserId } }),
        prisma.userSettings.findUnique({ where: { userId: normalizedUserId } }),
        prisma.userFavorite.findMany({
            where: { userId: normalizedUserId },
            orderBy: { addedAt: 'desc' }
        }),
        prisma.userVisit.findMany({
            where: { userId: normalizedUserId },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const allPlaceIds = [
        ...new Set([
            ...favorites.map(favorite => favorite.placeId),
            ...visits.map(visit => visit.placeId)
        ])
    ];

    let places = [];
    if (allPlaceIds.length > 0) {
        const objectIds = allPlaceIds
            .filter(ObjectId.isValid)
            .map(id => new ObjectId(id));

        if (objectIds.length > 0) {
            const placesCollection = getPlacesCollection();
            places = await placesCollection.find({ _id: { $in: objectIds } }).toArray();
        }
    }

    const findPlace = (placeId) => places.find(place => place._id.toString() === placeId) || null;

    return {
        user: user || {},
        stats: stats || {},
        settings: settings || {},
        favorites: favorites.map(favorite => ({
            ...favorite,
            place: findPlace(favorite.placeId)
        })),
        visits: visits.map(visit => ({
            ...visit,
            place: findPlace(visit.placeId)
        }))
    };
};

module.exports = {
    anonymizeUserData,
    anonymizeAccount,
    getUserDataForExport
};
