const { ObjectId } = require('mongodb');
const { getPlaceById } = require('../models/placesModel');
const { previewVisitPoints, getPointSummary, getPointHistory } = require('../models/pointModel');

const getSummary = async (req, res) => {
    try {
        const summary = await getPointSummary(req.session.user.id);
        return res.status(200).json({ success: true, summary });
    } catch (error) {
        console.error('Erreur recuperation resume des points :', error);
        return res.status(500).json({ success: false, message: 'Impossible de recuperer les points.' });
    }
};

const getHistory = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    try {
        const history = await getPointHistory(req.session.user.id, page, limit);
        return res.status(200).json({ success: true, ...history });
    } catch (error) {
        console.error('Erreur recuperation historique des points :', error);
        return res.status(500).json({ success: false, message: 'Impossible de recuperer l historique.' });
    }
};

const previewVisit = async (req, res) => {
    const { placeId } = req.params;
    if (!ObjectId.isValid(placeId)) {
        return res.status(400).json({ success: false, message: 'Identifiant de lieu invalide.' });
    }

    try {
        const place = await getPlaceById(placeId);
        if (!place) return res.status(404).json({ success: false, message: 'Lieu introuvable.' });

        const preview = await previewVisitPoints(req.session.user.id, placeId, place.category);
        return res.status(200).json({
            success: true,
            placeId,
            category: place.category,
            preview
        });
    } catch (error) {
        console.error('Erreur estimation des points :', error);
        return res.status(500).json({ success: false, message: 'Impossible d estimer les points.' });
    }
};

module.exports = { getSummary, getHistory, previewVisit };
