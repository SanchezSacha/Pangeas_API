const prisma = require('../../BDD/prisma');

const listPartners = () => prisma.partner.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { rewards: true } } }
});

const createPartner = (data) => prisma.partner.create({ data });

const updatePartner = (partnerId, data) => prisma.partner.update({
    where: { id: partnerId },
    data
});

const listRewards = () => prisma.reward.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
        partner: true,
        couponCodes: { select: { status: true } },
        _count: { select: { couponCodes: true, redemptions: true } }
    }
});

const getReward = rewardId => prisma.reward.findUnique({
    where: { id: rewardId },
    include: {
        partner: true,
        couponCodes: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, code: true, status: true, expiresAt: true, assignedAt: true, usedCount: true }
        },
        _count: { select: { redemptions: true } }
    }
});

const createReward = (data) => prisma.reward.create({
    data,
    include: { partner: true }
});

const updateReward = (rewardId, data) => prisma.reward.update({
    where: { id: rewardId },
    data,
    include: { partner: true }
});

const deactivateReward = rewardId => updateReward(rewardId, { isActive: false });

const addCouponCodes = (rewardId, codes) => prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.type !== 'coupon') {
        const error = new Error('Recompense coupon introuvable.');
        error.code = 'REWARD_NOT_FOUND';
        throw error;
    }

    await tx.couponCode.createMany({
        data: codes.map(item => ({
            rewardId,
            code: item.code,
            expiresAt: item.expiresAt
        }))
    });

    return tx.couponCode.count({ where: { rewardId, status: 'available' } });
});

const updateCouponStatus = (couponId, status) => prisma.couponCode.update({
    where: { id: couponId },
    data: {
        status,
        ...(status === 'available' ? { assignedToUserId: null, assignedAt: null } : {})
    }
});

module.exports = {
    listPartners,
    createPartner,
    updatePartner,
    listRewards,
    getReward,
    createReward,
    updateReward,
    deactivateReward,
    addCouponCodes,
    updateCouponStatus
};
