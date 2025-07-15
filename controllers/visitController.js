const { getOngoingVisitByUserId, startVisit } = require('../models/visitModel');

const startUserVisit = async (req, res) => {
    const { user_id, place_id, user_lat, user_lng } = req.body;

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

module.exports = {startUserVisit};
