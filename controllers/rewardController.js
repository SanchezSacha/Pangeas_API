const { getIdempotencyKey } = require('../utils/idempotency');
const {
    RewardError,
    listRewards,
    getRewardById,
    redeemReward,
    getUserRedemptions
} = require('../models/rewardModel');

const list = async (req, res) => {
    try {
        const rewards = await listRewards({ type: 'coupon' });
        return res.status(200).json({ success: true, rewards });
    } catch (error) {
        console.error('Erreur catalogue recompenses :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger les recompenses.' });
    }
};

const getOne = async (req, res) => {
    const rewardId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(rewardId) || rewardId <= 0) {
        return res.status(400).json({ success: false, message: 'Recompense invalide.' });
    }

    try {
        const reward = await getRewardById(rewardId);
        if (!reward) return res.status(404).json({ success: false, message: 'Recompense introuvable.' });
        return res.status(200).json({ success: true, reward });
    } catch (error) {
        console.error('Erreur detail recompense :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger la recompense.' });
    }
};

const redeem = async (req, res) => {
    const rewardId = Number.parseInt(req.params.id, 10);
    const clientRequestId = getIdempotencyKey(req);
    if (!Number.isInteger(rewardId) || rewardId <= 0) {
        return res.status(400).json({ success: false, message: 'Recompense invalide.' });
    }
    if (!clientRequestId) {
        return res.status(400).json({
            success: false,
            message: 'Un en-tete Idempotency-Key valide est obligatoire pour cet echange.'
        });
    }

    try {
        const redemption = await redeemReward({
            userId: req.session.user.id,
            rewardId,
            clientRequestId
        });
        return res.status(200).json({ success: true, redemption });
    } catch (error) {
        if (error instanceof RewardError) {
            return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        }
        console.error('Erreur echange recompense :', error);
        return res.status(500).json({ success: false, message: 'Impossible de finaliser l echange.' });
    }
};

const history = async (req, res) => {
    try {
        const redemptions = await getUserRedemptions(req.session.user.id);
        return res.status(200).json({ success: true, redemptions });
    } catch (error) {
        console.error('Erreur historique recompenses :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger vos coupons.' });
    }
};

module.exports = { list, getOne, redeem, history };
