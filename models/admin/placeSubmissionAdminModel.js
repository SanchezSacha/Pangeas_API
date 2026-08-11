const prisma = require('../../BDD/prisma');
const { getPlacesCollection } = require('../../BDD/mongo');
const haversineDistance = require('haversine-distance');
const { awardApprovedPlaceSubmissionPoints } = require('../pointModel');
const { promoteSubmissionPhotos } = require('../../services/placeSubmissionImageService');

class PlaceSubmissionAdminError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const detailInclude = {
    user: { select: { id: true, pseudo: true, email: true } },
    photos: { orderBy: { orderIndex: 'asc' } },
    moderations: {
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, pseudo: true } } }
    }
};

const listAdminPlaceSubmissions = async ({ status, query, page, limit }) => {
    const where = {
        ...(status ? { status } : {}),
        ...(query ? {
            OR: [
                { title: { contains: query } },
                { user: { pseudo: { contains: query } } }
            ]
        } : {})
    };
    const skip = (page - 1) * limit;
    const [submissions, total] = await Promise.all([
        prisma.placeSubmission.findMany({
            where,
            orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
            skip,
            take: limit,
            include: {
                user: { select: { id: true, pseudo: true } },
                photos: { orderBy: { orderIndex: 'asc' }, take: 1 }
            }
        }),
        prisma.placeSubmission.count({ where })
    ]);
    return { submissions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getAdminPlaceSubmission = async submissionId => {
    const submission = await prisma.placeSubmission.findUnique({
        where: { id: submissionId },
        include: detailInclude
    });
    if (!submission) return null;

    const { lat, lng } = submission.coordinates || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...submission, nearbyPlaces: [] };

    const candidates = await getPlacesCollection().find({
        is_published: { $ne: false },
        'coordinates.lat': { $gte: lat - 0.02, $lte: lat + 0.02 },
        'coordinates.lng': { $gte: lng - 0.03, $lte: lng + 0.03 }
    }).project({ name: 1, category: 1, coordinates: 1 }).limit(30).toArray();

    const nearbyPlaces = candidates
        .map(place => ({
            id: place._id.toString(),
            name: place.name,
            category: place.category,
            distanceMeters: Math.round(haversineDistance(
                { lat, lng },
                { lat: place.coordinates.lat, lng: place.coordinates.lng }
            ))
        }))
        .filter(place => place.distanceMeters <= 1500)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 5);

    return { ...submission, nearbyPlaces };
};

const moderatePlaceSubmission = async ({ submissionId, adminId, action, comment }) => {
    const nextStatus = action === 'request_changes' ? 'needs_changes' : 'rejected';
    const notificationType = action === 'request_changes' ? 'submission_needs_changes' : 'submission_rejected';
    const notificationTitle = action === 'request_changes'
        ? 'Votre proposition est a completer'
        : 'Votre proposition a ete refusee';

    return prisma.$transaction(async tx => {
        const current = await tx.placeSubmission.findUnique({ where: { id: submissionId } });
        if (!current) throw new PlaceSubmissionAdminError('NOT_FOUND', 'Proposition introuvable.', 404);
        if (current.status !== 'pending') {
            throw new PlaceSubmissionAdminError('INVALID_STATUS', 'Cette proposition a deja ete traitee.', 409);
        }

        const updated = await tx.placeSubmission.updateMany({
            where: { id: submissionId, status: 'pending' },
            data: { status: nextStatus, adminComment: comment, reviewedAt: new Date() }
        });
        if (updated.count !== 1) {
            throw new PlaceSubmissionAdminError('CONCURRENT_MODERATION', 'Un autre administrateur vient de traiter cette demande.', 409);
        }

        await tx.placeSubmissionModeration.create({
            data: { submissionId, adminId, action, comment }
        });
        await tx.internalNotification.create({
            data: {
                userId: current.userId,
                type: notificationType,
                title: notificationTitle,
                message: comment,
                link: `/account/place-submissions/${submissionId}`
            }
        });

        return tx.placeSubmission.findUnique({ where: { id: submissionId }, include: detailInclude });
    }, { isolationLevel: 'Serializable' });
};

const validateFinalPlace = place => {
    if (
        !place.name || !place.department || !place.region || !place.category ||
        !place.description || !place.legend || !place.anecdote ||
        !place.activities.length || !place.coordinates || place.distance_km == null
    ) {
        throw new PlaceSubmissionAdminError(
            'INCOMPLETE_PLACE',
            'Completez toutes les informations editoriales du lieu avant sa publication.'
        );
    }
};

const publishPlaceSubmission = async ({ submissionId, adminId, placeData, comment }) => {
    const submission = await prisma.placeSubmission.findUnique({
        where: { id: submissionId },
        include: { photos: { orderBy: { orderIndex: 'asc' } } }
    });
    if (!submission) throw new PlaceSubmissionAdminError('NOT_FOUND', 'Proposition introuvable.', 404);

    const places = getPlacesCollection();
    if (submission.status === 'approved' && submission.mongoPlaceId) {
        await places.updateOne(
            { submission_id: submissionId },
            { $set: { is_published: true, updated_at: new Date() } }
        );
        const transactions = await prisma.pointTransaction.findMany({
            where: { userId: submission.userId, type: 'place_submission', referenceId: String(submissionId) }
        });
        return {
            submission,
            mongoPlaceId: submission.mongoPlaceId,
            points: transactions.reduce((sum, transaction) => sum + transaction.points, 0),
            alreadyPublished: true
        };
    }
    if (submission.status !== 'pending') {
        throw new PlaceSubmissionAdminError('INVALID_STATUS', 'Seule une proposition en attente peut etre publiee.', 409);
    }

    const mergedPlace = {
        ...placeData,
        name: placeData.name || submission.title,
        category: placeData.category || submission.category,
        description: placeData.description || submission.description,
        coordinates: placeData.coordinates || submission.coordinates
    };
    validateFinalPlace(mergedPlace);

    const publicPhotoUrls = await promoteSubmissionPhotos(submission.photos);
    const imageUrl = mergedPlace.image_url || publicPhotoUrls[0];
    if (!imageUrl) throw new PlaceSubmissionAdminError('PHOTO_REQUIRED', 'Aucune photo publiable n est disponible.');

    const now = new Date();
    const finalPlace = {
        ...mergedPlace,
        image_url: imageUrl,
        images: [...new Set([imageUrl, ...publicPhotoUrls])],
        source: 'user_submission',
        submission_id: submissionId,
        is_published: false,
        updated_at: now
    };

    await places.updateOne(
        { submission_id: submissionId },
        {
            $set: finalPlace,
            $setOnInsert: { created_at: now }
        },
        { upsert: true }
    );
    const mongoPlace = await places.findOne({ submission_id: submissionId });
    if (!mongoPlace) throw new Error('Mongo place creation failed');
    const mongoPlaceId = mongoPlace._id.toString();

    const execute = () => prisma.$transaction(async tx => {
        const current = await tx.placeSubmission.findUnique({ where: { id: submissionId } });
        if (!current) throw new PlaceSubmissionAdminError('NOT_FOUND', 'Proposition introuvable.', 404);

        if (current.status === 'approved') {
            return { award: { awarded: false, points: 0 }, submission: current };
        }
        if (current.status !== 'pending') {
            throw new PlaceSubmissionAdminError('CONCURRENT_MODERATION', 'Un autre administrateur vient de traiter cette demande.', 409);
        }

        const award = await awardApprovedPlaceSubmissionPoints(tx, current.userId, submissionId);
        const userMessage = comment || `Votre lieu a ete publie. Vous gagnez ${award.points} points.`;

        const updated = await tx.placeSubmission.updateMany({
            where: { id: submissionId, status: 'pending' },
            data: {
                status: 'approved',
                adminComment: userMessage,
                mongoPlaceId,
                reviewedAt: now,
                approvedAt: now
            }
        });
        if (updated.count !== 1) {
            throw new PlaceSubmissionAdminError('CONCURRENT_MODERATION', 'Un autre administrateur vient de traiter cette demande.', 409);
        }

        await tx.placeSubmissionModeration.create({
            data: { submissionId, adminId, action: 'approve', comment: userMessage }
        });
        await tx.internalNotification.create({
            data: {
                userId: current.userId,
                type: 'submission_approved',
                title: 'Votre lieu est publie',
                message: userMessage,
                link: `/places/${mongoPlaceId}`
            }
        });

        return {
            award,
            submission: await tx.placeSubmission.findUnique({ where: { id: submissionId } })
        };
    }, { isolationLevel: 'Serializable' });

    let transactionResult;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            transactionResult = await execute();
            break;
        } catch (error) {
            if (error.code !== 'P2034' || attempt === 3) throw error;
        }
    }

    await places.updateOne(
        { submission_id: submissionId },
        { $set: { is_published: true, updated_at: new Date() } }
    );

    return {
        submission: transactionResult.submission,
        mongoPlaceId,
        points: transactionResult.award.points,
        approvalNumber: transactionResult.award.approvalNumber,
        alreadyPublished: false
    };
};

module.exports = {
    PlaceSubmissionAdminError,
    listAdminPlaceSubmissions,
    getAdminPlaceSubmission,
    moderatePlaceSubmission,
    publishPlaceSubmission
};
