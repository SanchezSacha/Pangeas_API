const prisma = require('../BDD/prisma');

const DONATION_AMOUNTS = Object.freeze([5, 10, 25]);

class DonationError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const activeCampaignFilter = (now = new Date()) => ({
    isActive: true,
    AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gt: now } }] }
    ],
    partner: { is: { isActive: true } }
});

const listDonationCampaigns = () => prisma.donationCampaign.findMany({
    where: activeCampaignFilter(),
    orderBy: { createdAt: 'desc' },
    include: {
        partner: { select: { id: true, name: true, logoUrl: true, websiteUrl: true } },
        _count: { select: { donations: { where: { status: { in: ['pending', 'confirmed'] } } } } }
    }
});

const redeemDonation = async ({ userId, campaignId, amount, clientRequestId }) => {
    if (!DONATION_AMOUNTS.includes(amount)) {
        throw new DonationError('INVALID_AMOUNT', 'Les montants disponibles sont 5, 10 ou 25 euros.');
    }

    const previous = await prisma.donation.findUnique({
        where: { clientRequestId },
        include: { campaign: { include: { partner: true } } }
    });
    if (previous) {
        if (previous.userId !== userId || previous.campaignId !== campaignId || Number(previous.amount) !== amount) {
            throw new DonationError('IDEMPOTENCY_CONFLICT', 'Cette cle a deja ete utilisee pour une autre demande.', 409);
        }
        return previous;
    }

    const execute = () => prisma.$transaction(async (tx) => {
        const campaign = await tx.donationCampaign.findFirst({
            where: { id: campaignId, ...activeCampaignFilter() }
        });
        if (!campaign) throw new DonationError('CAMPAIGN_UNAVAILABLE', 'Cette campagne n est plus disponible.', 404);

        if (campaign.budgetAmount != null && Number(campaign.currentAmount) + amount > Number(campaign.budgetAmount)) {
            throw new DonationError('BUDGET_EXHAUSTED', 'Le budget finance par le partenaire est epuise.', 409);
        }

        const pointsCost = amount * campaign.pointsPerEuro;
        const account = await tx.pointAccount.findUnique({ where: { userId } });
        if (!account || account.availablePoints < pointsCost) {
            throw new DonationError('INSUFFICIENT_POINTS', 'Votre solde de points est insuffisant.', 409);
        }

        const donation = await tx.donation.create({
            data: {
                userId,
                campaignId,
                amount: amount.toFixed(2),
                pointsSpent: pointsCost,
                clientRequestId,
                status: 'pending'
            }
        });

        const debited = await tx.pointAccount.updateMany({
            where: { userId, availablePoints: { gte: pointsCost } },
            data: { availablePoints: { decrement: pointsCost } }
        });
        if (debited.count !== 1) {
            throw new DonationError('INSUFFICIENT_POINTS', 'Votre solde de points est insuffisant.', 409);
        }

        await Promise.all([
            tx.donationCampaign.update({
                where: { id: campaignId },
                data: { currentAmount: { increment: amount } }
            }),
            tx.pointTransaction.create({
                data: {
                    userId,
                    type: 'donation_redemption',
                    points: -pointsCost,
                    reason: `Don de ${amount} euros declenche`,
                    referenceType: 'donation',
                    referenceId: String(donation.id)
                }
            })
        ]);

        return tx.donation.findUnique({
            where: { id: donation.id },
            include: { campaign: { include: { partner: true } } }
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

const getUserDonations = userId => prisma.donation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { campaign: { include: { partner: true } } }
});

module.exports = {
    DONATION_AMOUNTS,
    DonationError,
    listDonationCampaigns,
    redeemDonation,
    getUserDonations
};
