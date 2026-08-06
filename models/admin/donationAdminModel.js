const prisma = require('../../BDD/prisma');

const createCampaign = data => prisma.donationCampaign.create({
    data,
    include: { partner: true }
});

const listCampaigns = () => prisma.donationCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
        partner: true,
        _count: { select: { donations: true } }
    }
});

const updateCampaign = (campaignId, data) => prisma.donationCampaign.update({
    where: { id: campaignId },
    data,
    include: { partner: true, _count: { select: { donations: true } } }
});

const deactivateCampaign = campaignId => updateCampaign(campaignId, { isActive: false });

const listDonations = () => prisma.donation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
        user: { select: { id: true, pseudo: true, email: true } },
        campaign: { include: { partner: true } }
    }
});

const updateDonationStatus = (donationId, nextStatus) => prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({ where: { id: donationId } });
    if (!donation) {
        const error = new Error('Don introuvable.');
        error.code = 'DONATION_NOT_FOUND';
        throw error;
    }
    if (donation.status === nextStatus) return donation;
    if (donation.status !== 'pending') {
        const error = new Error('Seul un don en attente peut changer de statut.');
        error.code = 'INVALID_DONATION_STATUS';
        throw error;
    }

    if (nextStatus === 'confirmed') {
        return tx.donation.update({
            where: { id: donationId },
            data: { status: 'confirmed', confirmedAt: new Date() }
        });
    }

    await Promise.all([
        tx.pointAccount.update({
            where: { userId: donation.userId },
            data: { availablePoints: { increment: donation.pointsSpent } }
        }),
        tx.donationCampaign.update({
            where: { id: donation.campaignId },
            data: { currentAmount: { decrement: donation.amount } }
        }),
        tx.pointTransaction.create({
            data: {
                userId: donation.userId,
                type: 'donation_refund',
                points: donation.pointsSpent,
                reason: 'Remboursement d un don annule',
                referenceType: 'donation',
                referenceId: String(donation.id)
            }
        })
    ]);

    return tx.donation.update({
        where: { id: donationId },
        data: { status: 'cancelled', confirmedAt: null }
    });
}, { isolationLevel: 'Serializable' });

module.exports = {
    createCampaign,
    listCampaigns,
    updateCampaign,
    deactivateCampaign,
    listDonations,
    updateDonationStatus
};
