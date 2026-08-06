const { getOngoingVisitByPlaceAndUser, validateVisitAndUpdateStats, getVisitByClientEventId } = require('../models/visitModel');
const { getPlaceById } = require('../models/placesModel');
const haversine = require('haversine-distance');
const { ObjectId } = require('mongodb');
const { getIdempotencyKey } = require('../utils/idempotency');
const { getVisitAwardByVisitId } = require('../models/pointModel');

const validateVisit = async (req, res) => {
    const user_id = req.session?.user?.id;
    const { place_id, user_lat, user_lng } = req.body;
    const idempotencyKey = getIdempotencyKey(req);

    if (!user_id) {
        return res.status(401).json({ success: false, message: "Non authentifié" });
    }
    const latitude = Number(user_lat);
    const longitude = Number(user_lng);
    if (!ObjectId.isValid(place_id) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ success: false, message: 'Lieu ou coordonnées invalides.' });
    }
    try {
        if (idempotencyKey) {
            const previousVisit = await getVisitByClientEventId(user_id, idempotencyKey);
            if (previousVisit?.status === 'visited') {
                const points = await getVisitAwardByVisitId(user_id, previousVisit.id);
                return res.status(200).json({
                    success: true,
                    message: 'Visite déjà validée.',
                    distance_km: previousVisit.distance_km,
                    points
                });
            }
        }
        const place = await getPlaceById(place_id);
        if (!place || !place.coordinates) {
            return res.status(404).json({ success: false, message: "Lieu introuvable." });
        }

        const userCoords = { latitude, longitude };
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

        const validation = await validateVisitAndUpdateStats(
            ongoingVisit.id,
            user_id,
            distanceKm,
            place.category,
            idempotencyKey
        );
        if (!validation) {
            return res.status(409).json({ success: false, message: 'Cette visite a déjà été traitée.' });
        }

        return res.status(200).json({
            success: true,
            message: "Visite validée avec succès.",
            distance_km: distanceKm,
            points: validation.points
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
