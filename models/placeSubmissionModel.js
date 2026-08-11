const prisma = require('../BDD/prisma');
const { buildPlaceSubmissionAward } = require('../services/pointRules');

const OPEN_STATUSES = ['pending', 'needs_changes'];

class PlaceSubmissionError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const submissionInclude = {
    photos: { orderBy: { orderIndex: 'asc' } },
    moderations: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, action: true, comment: true, createdAt: true }
    }
};

const getRewardPreview = async userId => {
    const approved = await prisma.pointTransaction.count({
        where: { userId, type: 'place_submission' }
    });
    return { approved, ...buildPlaceSubmissionAward(approved) };
};

const createPlaceSubmission = async ({ userId, clientRequestId, input, photos }) => {
    const previous = await prisma.placeSubmission.findUnique({
        where: { clientRequestId },
        include: submissionInclude
    });
    if (previous) {
        if (previous.userId !== userId) {
            throw new PlaceSubmissionError(
                'IDEMPOTENCY_CONFLICT',
                'Cette cle a deja ete utilisee pour une autre demande.',
                409
            );
        }
        return { created: false, submission: previous };
    }

    const execute = () => prisma.$transaction(async tx => {
        const user = await tx.user.findUnique({
            where: { id: userId },
            select: { isActive: true, status: true, isEmailVerified: true }
        });
        if (!user || !user.isActive || user.status !== 'active') {
            throw new PlaceSubmissionError('ACCOUNT_INACTIVE', 'Ce compte ne peut pas proposer de lieu.', 403);
        }
        if (!user.isEmailVerified) {
            throw new PlaceSubmissionError(
                'EMAIL_NOT_VERIFIED',
                'Votre adresse e-mail doit etre verifiee avant de proposer un lieu.',
                403
            );
        }

        const now = Date.now();
        const [last24Hours, last30Days, open] = await Promise.all([
            tx.placeSubmission.count({
                where: { userId, createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } }
            }),
            tx.placeSubmission.count({
                where: { userId, createdAt: { gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } }
            }),
            tx.placeSubmission.count({ where: { userId, status: { in: OPEN_STATUSES } } })
        ]);

        if (last24Hours >= 3) {
            throw new PlaceSubmissionError('DAILY_LIMIT_REACHED', 'La limite de 3 propositions sur 24 heures est atteinte.', 429);
        }
        if (last30Days >= 10) {
            throw new PlaceSubmissionError('MONTHLY_LIMIT_REACHED', 'La limite de 10 propositions sur 30 jours est atteinte.', 429);
        }
        if (open >= 5) {
            throw new PlaceSubmissionError('OPEN_LIMIT_REACHED', 'Vous avez deja 5 propositions en cours.', 409);
        }

        return tx.placeSubmission.create({
            data: {
                userId,
                clientRequestId,
                ...input,
                photos: { create: photos }
            },
            include: submissionInclude
        });
    }, { isolationLevel: 'Serializable' });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const submission = await execute();
            return { created: true, submission };
        } catch (error) {
            if (error.code === 'P2002') {
                const submission = await prisma.placeSubmission.findUnique({
                    where: { clientRequestId },
                    include: submissionInclude
                });
                if (submission?.userId === userId) return { created: false, submission };
            }
            if (error.code !== 'P2034' || attempt === 3) throw error;
        }
    }
};

const listUserPlaceSubmissions = (userId, { page, limit }) => {
    const skip = (page - 1) * limit;
    return Promise.all([
        prisma.placeSubmission.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: { photos: { orderBy: { orderIndex: 'asc' } } }
        }),
        prisma.placeSubmission.count({ where: { userId } })
    ]).then(([submissions, total]) => ({
        submissions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    }));
};

const getUserPlaceSubmission = (userId, submissionId) => prisma.placeSubmission.findFirst({
    where: { id: submissionId, userId },
    include: submissionInclude
});

const resubmitPlaceSubmission = async ({ userId, submissionId, input, photos }) => prisma.$transaction(async tx => {
    const current = await tx.placeSubmission.findFirst({
        where: { id: submissionId, userId },
        include: { photos: true }
    });
    if (!current) throw new PlaceSubmissionError('NOT_FOUND', 'Proposition introuvable.', 404);
    if (current.status !== 'needs_changes') {
        throw new PlaceSubmissionError(
            'INVALID_STATUS',
            'Seule une proposition a completer peut etre renvoyee.',
            409
        );
    }

    const hasReplacementPhotos = photos.length > 0;
    if (!hasReplacementPhotos && current.photos.length === 0) {
        throw new PlaceSubmissionError('PHOTOS_REQUIRED', 'Au moins une photo est obligatoire.');
    }

    const updated = await tx.placeSubmission.updateMany({
        where: { id: submissionId, userId, status: 'needs_changes' },
        data: {
            ...input,
            status: 'pending',
            adminComment: null,
            reviewedAt: null
        }
    });
    if (updated.count !== 1) {
        throw new PlaceSubmissionError('CONCURRENT_UPDATE', 'Cette proposition vient d etre modifiee.', 409);
    }

    if (hasReplacementPhotos) {
        await tx.placeSubmissionPhoto.deleteMany({ where: { submissionId } });
        await tx.placeSubmissionPhoto.createMany({
            data: photos.map(photo => ({ ...photo, submissionId }))
        });
    }

    const submission = await tx.placeSubmission.findUnique({
        where: { id: submissionId },
        include: submissionInclude
    });

    return { submission, replacedPhotos: hasReplacementPhotos ? current.photos : [] };
}, { isolationLevel: 'Serializable' });

const cancelPlaceSubmission = async (userId, submissionId) => {
    const updated = await prisma.placeSubmission.updateMany({
        where: { id: submissionId, userId, status: { in: OPEN_STATUSES } },
        data: { status: 'cancelled', adminComment: null }
    });
    if (updated.count !== 1) {
        const exists = await prisma.placeSubmission.findFirst({ where: { id: submissionId, userId } });
        if (!exists) throw new PlaceSubmissionError('NOT_FOUND', 'Proposition introuvable.', 404);
        throw new PlaceSubmissionError('INVALID_STATUS', 'Cette proposition ne peut plus etre annulee.', 409);
    }
};

const getPhotoForViewer = async ({ submissionId, photoId, userId, isAdmin }) => {
    const photo = await prisma.placeSubmissionPhoto.findFirst({
        where: {
            id: photoId,
            submissionId,
            ...(isAdmin ? {} : { submission: { userId } })
        }
    });
    return photo;
};

module.exports = {
    PlaceSubmissionError,
    createPlaceSubmission,
    listUserPlaceSubmissions,
    getUserPlaceSubmission,
    resubmitPlaceSubmission,
    cancelPlaceSubmission,
    getRewardPreview,
    getPhotoForViewer
};
