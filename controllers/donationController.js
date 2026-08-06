const { getIdempotencyKey } = require('../utils/idempotency');
const {
    DonationError,
    listDonationCampaigns,
    redeemDonation,
    getUserDonations
} = require('../models/donationModel');

const list = async (req, res) => {
    try {
        return res.status(200).json({ success: true, campaigns: await listDonationCampaigns() });
    } catch (error) {
        console.error('Erreur catalogue des dons :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger les campagnes.' });
    }
};

const redeem = async (req, res) => {
    const campaignId = Number.parseInt(req.params.id, 10);
    const amount = Number(req.body.amount);
    const clientRequestId = getIdempotencyKey(req);
    if (!Number.isInteger(campaignId) || campaignId <= 0) {
        return res.status(400).json({ success: false, message: 'Campagne invalide.' });
    }
    if (!clientRequestId) {
        return res.status(400).json({ success: false, message: 'Un en-tete Idempotency-Key valide est obligatoire.' });
    }

    try {
        const donation = await redeemDonation({
            userId: req.session.user.id,
            campaignId,
            amount,
            clientRequestId
        });
        return res.status(200).json({
            success: true,
            message: 'Le don finance par le partenaire a ete declenche.',
            donation
        });
    } catch (error) {
        if (error instanceof DonationError) {
            return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        }
        console.error('Erreur declenchement du don :', error);
        return res.status(500).json({ success: false, message: 'Impossible de declencher le don.' });
    }
};

const history = async (req, res) => {
    try {
        return res.status(200).json({ success: true, donations: await getUserDonations(req.session.user.id) });
    } catch (error) {
        console.error('Erreur historique des dons :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger vos dons.' });
    }
};

module.exports = { list, redeem, history };
