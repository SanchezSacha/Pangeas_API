const prisma = require('../BDD/prisma');
const {
    POINT_RULES,
    buildVisitAward,
    buildPlaceSubmissionAward,
    getNextMilestone
} = require('../services/pointRules');

const CATEGORIES = ['nature', 'urbain', 'historique', 'frisson', 'secret'];

const countEligibleVisits = (client, userId, category = null) => client.pointTransaction.count({
    where: {
        userId,
        type: 'visit',
        ...(category ? { relatedVisit: { placeCategory: category } } : {})
    }
});

const previewVisitPoints = async (userId, placeId, category) => {
    const alreadyRewarded = await prisma.pointTransaction.findFirst({
        where: { userId, type: 'visit', referenceId: placeId },
        select: { id: true }
    });

    if (alreadyRewarded) {
        return {
            eligible: false,
            totalPoints: 0,
            entries: [],
            reason: 'Ce lieu a deja rapporte ses points.'
        };
    }

    const [previousTotalVisits, previousCategoryVisits] = await Promise.all([
        countEligibleVisits(prisma, userId),
        countEligibleVisits(prisma, userId, category)
    ]);

    return buildVisitAward({ previousTotalVisits, previousCategoryVisits, category });
};

const awardVisitPoints = async (tx, { userId, visitId, placeId, category }) => {
    const alreadyRewarded = await tx.pointTransaction.findFirst({
        where: { userId, type: 'visit', referenceId: placeId },
        select: { id: true }
    });

    if (alreadyRewarded) {
        return {
            eligible: false,
            totalPoints: 0,
            entries: [],
            reason: 'Ce lieu a deja rapporte ses points.'
        };
    }

    const [previousTotalVisits, previousCategoryVisits] = await Promise.all([
        countEligibleVisits(tx, userId),
        countEligibleVisits(tx, userId, category)
    ]);
    const award = buildVisitAward({ previousTotalVisits, previousCategoryVisits, category });

    for (const entry of award.entries) {
        if (entry.milestoneKey) {
            await tx.userMilestone.create({
                data: { userId, milestoneKey: entry.milestoneKey }
            });
        }

        await tx.pointTransaction.create({
            data: {
                userId,
                relatedVisitId: visitId,
                type: entry.type,
                points: entry.points,
                reason: entry.reason,
                referenceType: entry.milestoneKey ? 'milestone' : 'place',
                referenceId: entry.milestoneKey || placeId
            }
        });
    }

    await tx.pointAccount.upsert({
        where: { userId },
        create: {
            userId,
            totalPoints: award.totalPoints,
            availablePoints: award.totalPoints
        },
        update: {
            totalPoints: { increment: award.totalPoints },
            availablePoints: { increment: award.totalPoints }
        }
    });

    return award;
};

const getVisitAwardByVisitId = async (userId, visitId) => {
    const entries = await prisma.pointTransaction.findMany({
        where: { userId, relatedVisitId: visitId, points: { gt: 0 } },
        select: { type: true, points: true, reason: true, referenceId: true },
        orderBy: { id: 'asc' }
    });

    return {
        eligible: entries.length > 0,
        totalPoints: entries.reduce((sum, entry) => sum + entry.points, 0),
        entries
    };
};

const getPointSummary = async (userId) => {
    const [account, totalVisits, approvedSubmissions, ...categoryCounts] = await Promise.all([
        prisma.pointAccount.findUnique({ where: { userId } }),
        countEligibleVisits(prisma, userId),
        prisma.pointTransaction.count({ where: { userId, type: 'place_submission' } }),
        ...CATEGORIES.map(category => countEligibleVisits(prisma, userId, category))
    ]);

    const categories = Object.fromEntries(CATEGORIES.map((category, index) => {
        const count = categoryCounts[index];
        return [category, {
            count,
            nextMilestone: getNextMilestone(count, POINT_RULES.categoryMilestones)
        }];
    }));

    return {
        availablePoints: account?.availablePoints || 0,
        totalPointsEarned: account?.totalPoints || 0,
        eligibleUniqueVisits: totalVisits,
        nextGlobalMilestone: getNextMilestone(totalVisits, POINT_RULES.globalMilestones),
        placeSubmissions: {
            approved: approvedSubmissions,
            nextReward: buildPlaceSubmissionAward(approvedSubmissions)
        },
        categories
    };
};

const getPointHistory = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
        prisma.pointTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                type: true,
                points: true,
                reason: true,
                referenceType: true,
                referenceId: true,
                createdAt: true
            }
        }),
        prisma.pointTransaction.count({ where: { userId } })
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const awardApprovedPlaceSubmissionPoints = async (tx, userId, submissionId) => {
    const referenceId = String(submissionId);
    const previous = await tx.pointTransaction.findFirst({
        where: { userId, type: 'place_submission', referenceId },
        select: { id: true }
    });
    if (previous) return { awarded: false, points: 0 };

    const previousApprovedSubmissions = await tx.pointTransaction.count({
        where: { userId, type: 'place_submission' }
    });
    const award = buildPlaceSubmissionAward(previousApprovedSubmissions);

    await tx.pointTransaction.create({
        data: {
            userId,
            type: 'place_submission',
            points: award.points,
            reason: award.reason,
            referenceType: 'place_submission',
            referenceId
        }
    });
    await tx.pointAccount.upsert({
        where: { userId },
        create: {
            userId,
            totalPoints: award.points,
            availablePoints: award.points
        },
        update: {
            totalPoints: { increment: award.points },
            availablePoints: { increment: award.points }
        }
    });

    return { awarded: true, ...award };
};

module.exports = {
    previewVisitPoints,
    awardVisitPoints,
    getVisitAwardByVisitId,
    getPointSummary,
    getPointHistory,
    awardApprovedPlaceSubmissionPoints
};
