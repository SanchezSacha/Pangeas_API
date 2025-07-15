const { getOngoingVisitByPlaceAndUser, markVisitAsValidated } = require('../models/visitModel');
const { getPlaceById } = require('../models/placesModel');
const haversine = require('haversine-distance');

const validateVisit = async (req, res) => {
    const { user_id, place_id, user_lat, user_lng } = req.body;

    try {
        const place = await getPlaceById(place_id);
        if (!place || !place.coordinates) {
            return res.status(404).json({ success: false, message: "Lieu introuvable." });
        }

        const userCoords = { latitude: user_lat, longitude: user_lng };
        const placeCoords = {
            latitude: place.coordinates.lat,
            longitude: place.coordinates.lng
        };

        const distanceMeters = haversine(userCoords, placeCoords);
        const distanceKm = distanceMeters / 1000;

        if (distanceMeters > 50) {
            return res.status(400).json({
                success: false,
                message: `Vous êtes trop loin du lieu (${Math.round(distanceMeters)}m).`
            });
        }

        const ongoingVisit = await getOngoingVisitByPlaceAndUser(user_id, place_id);
        if (!ongoingVisit) {
            return res.status(404).json({ success: false, message: "Aucune visite en cours trouvée." });
        }

        await markVisitAsValidated(ongoingVisit.id, distanceKm);

        return res.status(200).json({
            success: true,
            message: "Visite validée avec succès.",
            distance_km: distanceKm
        });

    } catch (err) {
        console.error("Erreur dans validateVisit :", err);
        return res.status(500).json({
            success: false,
            message: "Erreur lors de la validation de la visite."
        });
    }
};

module.exports = { validateVisit };
