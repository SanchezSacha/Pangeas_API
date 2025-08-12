const { getPlacesCollection } = require('../../BDD/mongo');
const { ObjectId } = require('mongodb');
const { getTopVisitedPlaceIds } = require('../../models/admin/placeAdminModel');

const getTopVisitedPlacesController = async (req, res) => {
    try {
        const topPlaces = await getTopVisitedPlaceIds(3);

        if (topPlaces.length === 0) {
            return res.status(200).json([]);
        }

        const collection = getPlacesCollection();
        const objectIds = topPlaces.map(p => new ObjectId(p.place_id));
        const mongoPlaces = await collection.find({ _id: { $in: objectIds } }).toArray();

        const enriched = topPlaces.map(p => {
            const placeDetails = mongoPlaces.find(m => m._id.toString() === p.place_id);
            return {
                place_id: p.place_id,
                name: placeDetails?.name || 'Inconnu',
                department: placeDetails?.department,
                region: placeDetails?.region,
                category: placeDetails?.category,
                image_url: placeDetails?.image_url,
                visitCount: p.visitCount
            };
        });

        res.status(200).json(enriched);

    } catch (err) {
        console.error("Erreur top lieux visités :", err);
        res.status(500).json({ error: 'Erreur lors de la récupération des lieux les plus visités.' });
    }
};

module.exports = getTopVisitedPlacesController;
