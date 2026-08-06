const {
    createCampaign,
    listCampaigns,
    updateCampaign,
    deactivateCampaign,
    listDonations,
    updateDonationStatus
} = require('../../models/admin/donationAdminModel');

const optionalDate = value => {
    if (value == null || value === '') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const optionalMoney = value => {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number.toFixed(2) : undefined;
};

const getCampaigns = async (req, res) => {
    try {
        return res.status(200).json({ success: true, campaigns: await listCampaigns() });
    } catch (error) {
        console.error('Erreur administration campagnes :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger les campagnes.' });
    }
};

const postCampaign = async (req, res) => {
    const partnerId = Number(req.body.partnerId);
    const name = String(req.body.name || '').trim();
    const pointsPerEuro = req.body.pointsPerEuro == null ? 400 : Number(req.body.pointsPerEuro);
    const goalAmount = optionalMoney(req.body.goalAmount);
    const budgetAmount = optionalMoney(req.body.budgetAmount);
    const startDate = optionalDate(req.body.startDate);
    const endDate = optionalDate(req.body.endDate);

    if (!Number.isInteger(partnerId) || partnerId <= 0 || name.length < 2 || name.length > 160 ||
        !Number.isInteger(pointsPerEuro) || pointsPerEuro < 100 || pointsPerEuro > 5000 ||
        goalAmount === undefined || budgetAmount === undefined || startDate === undefined || endDate === undefined ||
        (startDate && endDate && endDate <= startDate)) {
        return res.status(400).json({ success: false, message: 'Donnees de campagne invalides.' });
    }

    try {
        const campaign = await createCampaign({
            partnerId,
            name,
            description: req.body.description ? String(req.body.description).trim().slice(0, 5000) : null,
            goalAmount,
            budgetAmount,
            pointsPerEuro,
            startDate,
            endDate,
            imageUrl: req.body.imageUrl ? String(req.body.imageUrl).trim().slice(0, 255) : null,
            isActive: req.body.isActive !== false
        });
        return res.status(201).json({ success: true, campaign });
    } catch (error) {
        if (error.code === 'P2003') return res.status(404).json({ success: false, message: 'Partenaire introuvable.' });
        console.error('Erreur creation campagne :', error);
        return res.status(500).json({ success: false, message: 'Impossible de creer la campagne.' });
    }
};

const patchCampaign = async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
        return res.status(400).json({ success: false, message: 'Campagne invalide.' });
    }

    const data = {};
    if (req.body.partnerId !== undefined) data.partnerId = Number(req.body.partnerId);
    if (req.body.name !== undefined) data.name = String(req.body.name || '').trim();
    if (req.body.description !== undefined) data.description = req.body.description ? String(req.body.description).trim().slice(0, 5000) : null;
    if (req.body.goalAmount !== undefined) data.goalAmount = optionalMoney(req.body.goalAmount);
    if (req.body.budgetAmount !== undefined) data.budgetAmount = optionalMoney(req.body.budgetAmount);
    if (req.body.pointsPerEuro !== undefined) data.pointsPerEuro = Number(req.body.pointsPerEuro);
    if (req.body.startDate !== undefined) data.startDate = optionalDate(req.body.startDate);
    if (req.body.endDate !== undefined) data.endDate = optionalDate(req.body.endDate);
    if (req.body.imageUrl !== undefined) data.imageUrl = req.body.imageUrl ? String(req.body.imageUrl).trim().slice(0, 255) : null;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive === true;

    if (!Object.keys(data).length ||
        (data.partnerId !== undefined && (!Number.isInteger(data.partnerId) || data.partnerId <= 0)) ||
        (data.name !== undefined && (data.name.length < 2 || data.name.length > 160)) ||
        (data.pointsPerEuro !== undefined && (!Number.isInteger(data.pointsPerEuro) || data.pointsPerEuro < 100 || data.pointsPerEuro > 5000)) ||
        (Object.hasOwn(data, 'goalAmount') && data.goalAmount === undefined) ||
        (Object.hasOwn(data, 'budgetAmount') && data.budgetAmount === undefined) ||
        (Object.hasOwn(data, 'startDate') && data.startDate === undefined) ||
        (Object.hasOwn(data, 'endDate') && data.endDate === undefined) ||
        (data.startDate && data.endDate && data.endDate <= data.startDate)) {
        return res.status(400).json({ success: false, message: 'Donnees de campagne invalides.' });
    }

    try {
        return res.status(200).json({ success: true, campaign: await updateCampaign(campaignId, data) });
    } catch (error) {
        if (error.code === 'P2003') return res.status(404).json({ success: false, message: 'Partenaire introuvable.' });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
        console.error('Erreur modification campagne :', error);
        return res.status(500).json({ success: false, message: 'Impossible de modifier la campagne.' });
    }
};

const deleteCampaign = async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
        return res.status(400).json({ success: false, message: 'Campagne invalide.' });
    }
    try {
        return res.status(200).json({ success: true, campaign: await deactivateCampaign(campaignId) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
        console.error('Erreur desactivation campagne :', error);
        return res.status(500).json({ success: false, message: 'Impossible de desactiver la campagne.' });
    }
};

const getDonations = async (req, res) => {
    try {
        return res.status(200).json({ success: true, donations: await listDonations() });
    } catch (error) {
        console.error('Erreur administration dons :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger les dons.' });
    }
};

const patchDonationStatus = async (req, res) => {
    const donationId = Number.parseInt(req.params.id, 10);
    const status = req.body.status;
    if (!Number.isInteger(donationId) || donationId <= 0 || !['confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Don ou statut invalide.' });
    }

    try {
        return res.status(200).json({ success: true, donation: await updateDonationStatus(donationId, status) });
    } catch (error) {
        if (error.code === 'DONATION_NOT_FOUND') return res.status(404).json({ success: false, message: error.message });
        if (error.code === 'INVALID_DONATION_STATUS' || error.code === 'P2002') return res.status(409).json({ success: false, message: error.message });
        console.error('Erreur statut don :', error);
        return res.status(500).json({ success: false, message: 'Impossible de modifier le don.' });
    }
};

module.exports = {
    getCampaigns,
    postCampaign,
    patchCampaign,
    deleteCampaign,
    getDonations,
    patchDonationStatus
};
