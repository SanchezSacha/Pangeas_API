const {
    getOngoingVisitByUserId,
    getVisitByClientEventId,
    startVisit,
    deleteVisitByUserId,
    getVisitedPlacesByUser,
    countVisitedPlacesByUser
} = require('../models/visitModel');
const { getPlacesCollection } = require('../BDD/mongo');
const { ObjectId } = require('mongodb');
const { getIdempotencyKey } = require('../utils/idempotency');
const { sanitizePlaceOutput } = require('../utils/placeSecurity');

const startUserVisit = async (req, res) => {
    const user_id = req.session?.user?.id;
    const { place_id } = req.body;
    const idempotencyKey = getIdempotencyKey(req);

    if (!user_id || !ObjectId.isValid(place_id)) {
        return res.status(400).json({
            success: false,
            message: "Données manquantes ou utilisateur non connecté."
        });
    }

    try {
        const place = await getPlacesCollection().findOne({ _id: new ObjectId(place_id) }, { projection: { _id: 1 } });
        if (!place) return res.status(404).json({ success: false, message: 'Lieu introuvable.' });

        if (idempotencyKey) {
            const previousVisit = await getVisitByClientEventId(user_id, idempotencyKey);
            if (previousVisit) {
                return res.status(200).json({ success: true, message: 'Visite déjà prise en compte.', visit: previousVisit });
            }
        }

        const ongoingVisit = await getOngoingVisitByUserId(user_id);
        if (ongoingVisit) {
            return res.status(400).json({
                success: false,
                message: "Une visite est déjà en cours. Veuillez la terminer avant d'en commencer une autre."
            });
        }

        const result = await startVisit(user_id, place_id, idempotencyKey);

        return res.status(200).json({
            success: true,
            message: "Visite démarrée.",
            visit: result
        });
    } catch (error) {
        console.error('Erreur dans startUserVisit:', error);
        return res.status(500).json({
            success: false,
            message: "Erreur serveur lors du démarrage de la visite."
        });
    }
};
const getOngoingVisit = async (req, res) => {
    const user_id = req.session?.user?.id;
    if (!user_id) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
    }

    try {
        const visit = await getOngoingVisitByUserId(user_id);
        if (!visit) {
            return res.status(200).json({ success: true, visit: null });
        }

        return res.status(200).json({ success: true, visit });
    } catch (error) {
        console.error('Erreur lors de la récupération de la visite en cours:', error);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};
const cancelVisit = async (req, res) => {
    const user_id = req.session?.user?.id;
    if (!user_id) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
    }
    try {
        await deleteVisitByUserId(user_id);
        return res.status(200).json({ success: true, message: "Visite annulée." });
    } catch (error) {
        console.error('Erreur lors de l\'annulation de la visite:', error);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

const getVisitedPlaces = async (req, res) => {
    const userId = req.session?.user?.id;
    const page = Math.max(1, Math.min(parseInt(req.query.page, 10) || 1, 100000));
    const limit = 10;
    const offset = (page - 1) * limit;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
    }
    try {
        const visits = await getVisitedPlacesByUser(userId, limit, offset);
        const placeIds = visits.map(v => v.place_id);

        const placesCollection = getPlacesCollection();
        const objectIds = placeIds.filter(ObjectId.isValid).map(id => new ObjectId(id));
        const places = await placesCollection.find({ _id: { $in: objectIds } }).toArray();

        const placesWithDate = placeIds.map(id => {
            const place = places.find(p => p._id.toString() === id);
            const visit = visits.find(v => v.place_id === id);
            return place ? sanitizePlaceOutput({ ...place, validated_at: visit?.validated_at }) : null;
        }).filter(p => p !== null);

        const totalVisited = await countVisitedPlacesByUser(userId);
        return res.status(200).json({
            success: true,
            places: placesWithDate,
            total: totalVisited
        });
    } catch (err) {
        console.error("Erreur dans getVisitedPlaces :", err);
        return res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

module.exports = {startUserVisit, cancelVisit, getOngoingVisit, getVisitedPlaces};
