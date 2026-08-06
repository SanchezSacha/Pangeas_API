const prisma = require('../BDD/prisma');

class RewardError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const rewardAvailabilityFilter = (now = new Date()) => ({
    isActive: true,
    AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
    ],
    partner: { is: { isActive: true } }
});

const listRewards = async ({ type = 'coupon' } = {}) => {
    const now = new Date();
    const where = {
        ...rewardAvailabilityFilter(now),
        ...(type ? { type } : {})
    };

    return prisma.reward.findMany({
        where,
        orderBy: [{ pointsCost: 'asc' }, { createdAt: 'desc' }],
        select: {
            id: true,
            name: true,
            description: true,
            type: true,
            pointsCost: true,
            discountPercent: true,
            minimumPurchase: true,
            maxDiscount: true,
            scope: true,
            terms: true,
            imageUrl: true,
            startsAt: true,
            endsAt: true,
            perUserLimit: true,
            partner: {
                select: { id: true, name: true, logoUrl: true, websiteUrl: true }
            },
            _count: {
                select: {
                    couponCodes: {
                        where: {
                            status: 'available',
                            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
                        }
                    }
                }
            }
        }
    });
};

const getRewardById = (rewardId) => {
    const now = new Date();
    return prisma.reward.findFirst({
    where: { id: rewardId, ...rewardAvailabilityFilter(now) },
    include: {
        partner: { select: { id: true, name: true, logoUrl: true, websiteUrl: true } },
        _count: {
            select: {
                couponCodes: {
                    where: {
                        status: 'available',
                        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
                    }
                }
            }
        }
    }
    });
};

const redeemReward = async ({ userId, rewardId, clientRequestId }) => {
    const previous = await prisma.rewardRedemption.findUnique({
        where: { clientRequestId },
        include: { reward: true, couponCode: true }
    });
    if (previous) {
        if (previous.userId !== userId || previous.rewardId !== rewardId) {
            throw new RewardError('IDEMPOTENCY_CONFLICT', 'Cette cle a deja ete utilisee pour une autre demande.', 409);
        }
        return previous;
    }

    const execute = () => prisma.$transaction(async (tx) => {
        const now = new Date();
        const reward = await tx.reward.findFirst({
            where: { id: rewardId, type: 'coupon', ...rewardAvailabilityFilter(now) }
        });
        if (!reward) throw new RewardError('REWARD_UNAVAILABLE', 'Cette recompense n est plus disponible.', 404);

        const redemptionCount = await tx.rewardRedemption.count({
            where: {
                userId,
                rewardId,
                status: { in: ['pending', 'completed'] }
            }
        });
        if (redemptionCount >= reward.perUserLimit) {
            throw new RewardError('USER_LIMIT_REACHED', 'La limite d echange pour cette offre est atteinte.', 409);
        }

        const coupon = await tx.couponCode.findFirst({
            where: {
                rewardId,
                status: 'available',
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
            },
            orderBy: { id: 'asc' }
        });
        if (!coupon) throw new RewardError('OUT_OF_STOCK', 'Aucun coupon n est actuellement disponible.', 409);

        const account = await tx.pointAccount.findUnique({ where: { userId } });
        if (!account || account.availablePoints < reward.pointsCost) {
            throw new RewardError('INSUFFICIENT_POINTS', 'Votre solde de points est insuffisant.', 409);
        }

        const redemption = await tx.rewardRedemption.create({
            data: {
                userId,
                rewardId,
                couponCodeId: coupon.id,
                clientRequestId,
                pointsSpent: reward.pointsCost,
                status: 'pending'
            }
        });

        const reserved = await tx.couponCode.updateMany({
            where: { id: coupon.id, status: 'available' },
            data: {
                status: 'reserved',
                assignedToUserId: userId,
                assignedAt: now
            }
        });
        if (reserved.count !== 1) throw new RewardError('OUT_OF_STOCK', 'Ce coupon vient d etre reserve.', 409);

        const debited = await tx.pointAccount.updateMany({
            where: { userId, availablePoints: { gte: reward.pointsCost } },
            data: { availablePoints: { decrement: reward.pointsCost } }
        });
        if (debited.count !== 1) {
            throw new RewardError('INSUFFICIENT_POINTS', 'Votre solde de points est insuffisant.', 409);
        }

        await tx.pointTransaction.create({
            data: {
                userId,
                type: 'reward_redemption',
                points: -reward.pointsCost,
                reason: `Coupon echange : ${reward.name}`,
                referenceType: 'reward_redemption',
                referenceId: String(redemption.id)
            }
        });

        return tx.rewardRedemption.update({
            where: { id: redemption.id },
            data: { status: 'completed', redeemedAt: now },
            include: { reward: true, couponCode: true }
        });
    }, { isolationLevel: 'Serializable' });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            return await execute();
        } catch (error) {
            if (error.code !== 'P2034' || attempt === 3) throw error;
        }
    }
};

const getUserRedemptions = (userId) => prisma.rewardRedemption.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
        reward: { include: { partner: true } },
        couponCode: true
    }
});

module.exports = {
    RewardError,
    listRewards,
    getRewardById,
    redeemReward,
    getUserRedemptions
};
