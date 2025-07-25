const { getOngoingVisitByUserId, startVisit, deleteVisitByUserId } = require('../models/visitModel');

const startUserVisit = async (req, res) => {
    const user_id = req.session?.user?.id;
    const { place_id, user_lat, user_lng } = req.body;

    if (!user_id || !place_id) {
        return res.status(400).json({
            success: false,
            message: "Données manquantes ou utilisateur non connecté."
        });
    }

    try {
        const ongoingVisit = await getOngoingVisitByUserId(user_id);
        if (ongoingVisit) {
            return res.status(400).json({
                success: false,
                message: "Une visite est déjà en cours. Veuillez la terminer avant d'en commencer une autre."
            });
        }

        const result = await startVisit(user_id, place_id);

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

module.exports = {startUserVisit, cancelVisit, getOngoingVisit };
