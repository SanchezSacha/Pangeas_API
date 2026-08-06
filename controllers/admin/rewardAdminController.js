const {
    listPartners,
    createPartner,
    updatePartner,
    listRewards,
    getReward: getRewardById,
    createReward,
    updateReward,
    deactivateReward,
    addCouponCodes,
    updateCouponStatus
} = require('../../models/admin/rewardAdminModel');

const cleanOptionalText = (value, maxLength) => {
    if (value == null || value === '') return null;
    const cleaned = String(value).trim();
    return cleaned.length <= maxLength ? cleaned : null;
};

const parseOptionalMoney = value => {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number.toFixed(2) : undefined;
};

const parseOptionalDate = value => {
    if (value == null || value === '') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const handleAdminError = (res, error) => {
    if (error.code === 'P2002') {
        return res.status(409).json({ success: false, message: 'Une valeur unique existe deja.' });
    }
    if (error.code === 'P2025' || error.code === 'REWARD_NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Element introuvable.' });
    }
    console.error('Erreur administration recompenses :', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de l operation.' });
};

const getPartners = async (req, res) => {
    try {
        return res.status(200).json({ success: true, partners: await listPartners() });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const postPartner = async (req, res) => {
    const name = cleanOptionalText(req.body.name, 120);
    if (!name) return res.status(400).json({ success: false, message: 'Nom partenaire invalide.' });

    try {
        const partner = await createPartner({
            name,
            description: cleanOptionalText(req.body.description, 5000),
            logoUrl: cleanOptionalText(req.body.logoUrl, 255),
            websiteUrl: cleanOptionalText(req.body.websiteUrl, 255),
            isActive: req.body.isActive !== false
        });
        return res.status(201).json({ success: true, partner });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const patchPartner = async (req, res) => {
    const partnerId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(partnerId) || partnerId <= 0) {
        return res.status(400).json({ success: false, message: 'Partenaire invalide.' });
    }
    const data = {};
    if (req.body.name !== undefined) {
        data.name = cleanOptionalText(req.body.name, 120);
        if (!data.name) return res.status(400).json({ success: false, message: 'Nom partenaire invalide.' });
    }
    for (const [key, max] of [['description', 5000], ['logoUrl', 255], ['websiteUrl', 255]]) {
        if (req.body[key] !== undefined) data[key] = cleanOptionalText(req.body[key], max);
    }
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive === true;
    if (!Object.keys(data).length) return res.status(400).json({ success: false, message: 'Aucune modification fournie.' });
    try {
        return res.status(200).json({ success: true, partner: await updatePartner(partnerId, data) });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const deletePartner = async (req, res) => {
    const partnerId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(partnerId) || partnerId <= 0) {
        return res.status(400).json({ success: false, message: 'Partenaire invalide.' });
    }
    try {
        return res.status(200).json({ success: true, partner: await updatePartner(partnerId, { isActive: false }) });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const getRewards = async (req, res) => {
    try {
        return res.status(200).json({ success: true, rewards: await listRewards() });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const getReward = async (req, res) => {
    const rewardId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(rewardId) || rewardId <= 0) {
        return res.status(400).json({ success: false, message: 'Recompense invalide.' });
    }
    try {
        const reward = await getRewardById(rewardId);
        if (!reward) return res.status(404).json({ success: false, message: 'Recompense introuvable.' });
        return res.status(200).json({ success: true, reward });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const normalizeRewardInput = (body, partial = false) => {
    const data = {};
    const set = (key, value) => {
        if (!partial || body[key] !== undefined) data[key] = value;
    };

    set('name', cleanOptionalText(body.name, 160));
    set('description', cleanOptionalText(body.description, 5000));
    set('imageUrl', cleanOptionalText(body.imageUrl, 255));
    set('scope', cleanOptionalText(body.scope, 120));
    set('terms', cleanOptionalText(body.terms, 10000));
    set('partnerId', Number(body.partnerId));
    set('type', 'coupon');
    set('pointsCost', Number(body.pointsCost));
    set('discountPercent', body.discountPercent == null ? null : Number(body.discountPercent));
    set('minimumPurchase', parseOptionalMoney(body.minimumPurchase));
    set('maxDiscount', parseOptionalMoney(body.maxDiscount));
    set('startsAt', parseOptionalDate(body.startsAt));
    set('endsAt', parseOptionalDate(body.endsAt));
    set('perUserLimit', body.perUserLimit == null ? 1 : Number(body.perUserLimit));
    set('isActive', body.isActive !== false);
    return data;
};

const validateRewardData = (data, partial = false) => {
    if ((!partial || data.name !== undefined) && !data.name) return 'Nom de recompense invalide.';
    if ((!partial || data.partnerId !== undefined) && (!Number.isInteger(data.partnerId) || data.partnerId <= 0)) return 'Partenaire invalide.';
    if ((!partial || data.pointsCost !== undefined) && (!Number.isInteger(data.pointsCost) || data.pointsCost <= 0 || data.pointsCost > 1000000)) return 'Cout en points invalide.';
    if (data.discountPercent != null && (!Number.isInteger(data.discountPercent) || data.discountPercent < 1 || data.discountPercent > 100)) return 'Pourcentage invalide.';
    if (data.minimumPurchase === undefined || data.maxDiscount === undefined) return 'Montant invalide.';
    if (data.startsAt === undefined || data.endsAt === undefined) return 'Date invalide.';
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) return 'La date de fin doit suivre la date de debut.';
    if ((!partial || data.perUserLimit !== undefined) && (!Number.isInteger(data.perUserLimit) || data.perUserLimit < 1 || data.perUserLimit > 100)) return 'Limite utilisateur invalide.';
    return null;
};

const postReward = async (req, res) => {
    const data = normalizeRewardInput(req.body);
    const validationError = validateRewardData(data);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    try {
        return res.status(201).json({ success: true, reward: await createReward(data) });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const patchReward = async (req, res) => {
    const rewardId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(rewardId) || rewardId <= 0) return res.status(400).json({ success: false, message: 'Recompense invalide.' });

    const data = normalizeRewardInput(req.body, true);
    const validationError = validateRewardData(data, true);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    if (Object.keys(data).length === 0) return res.status(400).json({ success: false, message: 'Aucune modification fournie.' });

    try {
        return res.status(200).json({ success: true, reward: await updateReward(rewardId, data) });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const deleteReward = async (req, res) => {
    const rewardId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(rewardId) || rewardId <= 0) {
        return res.status(400).json({ success: false, message: 'Recompense invalide.' });
    }
    try {
        return res.status(200).json({ success: true, reward: await deactivateReward(rewardId) });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const postCouponCodes = async (req, res) => {
    const rewardId = Number.parseInt(req.params.id, 10);
    const rawCodes = Array.isArray(req.body.codes) ? req.body.codes : [];
    if (!Number.isInteger(rewardId) || rewardId <= 0 || rawCodes.length < 1 || rawCodes.length > 500) {
        return res.status(400).json({ success: false, message: 'Liste de codes invalide (1 a 500 codes).' });
    }

    const defaultExpiration = parseOptionalDate(req.body.expiresAt);
    if (defaultExpiration === undefined || (defaultExpiration && defaultExpiration <= new Date())) {
        return res.status(400).json({ success: false, message: 'Date d expiration invalide.' });
    }
    const codes = rawCodes.map(value => ({
        code: String(value).trim().toUpperCase(),
        expiresAt: defaultExpiration
    }));
    if (codes.some(item => !/^[A-Z0-9_-]{4,120}$/.test(item.code)) || new Set(codes.map(item => item.code)).size !== codes.length) {
        return res.status(400).json({ success: false, message: 'Les codes doivent etre uniques et contenir 4 a 120 caracteres autorises.' });
    }

    try {
        const availableCount = await addCouponCodes(rewardId, codes);
        return res.status(201).json({ success: true, added: codes.length, availableCount });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

const patchCouponStatus = async (req, res) => {
    const couponId = Number.parseInt(req.params.id, 10);
    const allowed = ['available', 'used', 'expired'];
    if (!Number.isInteger(couponId) || couponId <= 0 || !allowed.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Coupon ou statut invalide.' });
    }
    try {
        return res.status(200).json({ success: true, coupon: await updateCouponStatus(couponId, req.body.status) });
    } catch (error) {
        return handleAdminError(res, error);
    }
};

module.exports = {
    getPartners,
    postPartner,
    patchPartner,
    deletePartner,
    getRewards,
    getReward,
    postReward,
    patchReward,
    deleteReward,
    postCouponCodes,
    patchCouponStatus
};
