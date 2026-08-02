const {
    getAllPlaces,
    getPlaceById,
    createPlace,
    updatePlace,
    deletePlace,
    getPlacesStats,
    getPlacesChartCategories,
    getPlacesChartVisits
} = require('../../models/admin/placeAdminModel');
const db = require('../../BDD/mysql');
const { getTotalUsers } = require('../../models/userModel');
const { getTotalVisited } = require('../../models/visitModel');
const { getPlacesCollection, getUserVisitsCollection } = require('../../BDD/mongo');
const { ObjectId } = require('mongodb');
const { normalizePlaceInput, sanitizePlaceOutput } = require('../../utils/placeSecurity');
const getAllPlacesController = async (req, res) => {
    try {
        const places = await getAllPlaces();
        res.status(200).json(places.map(sanitizePlaceOutput));
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des lieux.' });
    }
};
const getPlaceByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID invalide.' });

        const place = await getPlaceById(id);
        if (!place) return res.status(404).json({ error: 'Lieu non trouvé.' });

        res.status(200).json(sanitizePlaceOutput(place));
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du lieu.' });
    }
};
const createPlaceController = async (req, res) => {
    try {
        const placeData = normalizePlaceInput(req.body);

        if (
            !placeData.name || !placeData.department || !placeData.region || !placeData.category ||
            !placeData.description || !placeData.legend || !placeData.anecdote ||
            !placeData.activities.length || !placeData.image_url || !placeData.coordinates || placeData.distance_km == null
        ) {
            return res.status(400).json({ error: 'Champs manquants ou invalides (URL HTTPS, coordonnées et catégorie incluses).' });
        }

        const newPlace = {
            ...placeData,
            created_at: new Date()
        };

        const insertedId = await createPlace(newPlace);
        res.status(201).json({ message: 'Lieu créé avec succès.', placeId: insertedId });

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création du lieu.' });
    }
};
const updatePlaceController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID invalide.' });

        const updatedData = normalizePlaceInput(req.body);

        if (
            !updatedData.name || !updatedData.department || !updatedData.region || !updatedData.category ||
            !updatedData.description || !updatedData.legend || !updatedData.anecdote ||
            !updatedData.activities.length || !updatedData.image_url || !updatedData.coordinates || updatedData.distance_km == null
        ) {
            return res.status(400).json({ error: 'Champs manquants ou invalides (URL HTTPS, coordonnées et catégorie incluses).' });
        }

        const updated = await updatePlace(id, updatedData);
        if (!updated) return res.status(404).json({ error: 'Lieu non trouvé ou non modifié.' });

        res.status(200).json({ message: 'Lieu mis à jour avec succès.' });

    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du lieu.' });
    }
};
const deletePlaceController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'ID invalide.' });

        const deleted = await deletePlace(id);
        if (!deleted) return res.status(404).json({ error: 'Lieu non trouvé ou déjà supprimé.' });

        res.status(200).json({ message: 'Lieu supprimé avec succès.' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression du lieu.' });
    }
};
const getGlobalStatsController = async (req, res) => {
    try {
        const usersCount = await getTotalUsers();
        const placesCount = await getPlacesCollection().countDocuments();
        const visitsCount = await getTotalVisited();

        res.status(200).json({ usersCount, placesCount, visitsCount });
    } catch (err) {
        console.error('Erreur getGlobalStatsController:', err);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques.' });
    }
};
const getPlacesStatsController = async (req, res) => {
    try {
        const stats = await getPlacesStats();
        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors du calcul des statistiques.' });
    }
};

const getChartCategoriesController = async (req, res) => {
    try {
        const data = await getPlacesChartCategories();
        res.json(data);
    } catch (error) {
        console.error("Erreur dans getChartCategoriesController:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

const getChartVisitsController = async (req, res) => {
    try {
        const data = await getPlacesChartVisits();
        res.json(data);
    } catch (error) {
        console.error("Erreur dans getChartVisitsController:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

module.exports = {
    getAllPlacesController,
    getPlaceByIdController,
    createPlaceController,
    updatePlaceController,
    deletePlaceController,
    getGlobalStatsController,
    getPlacesStatsController,
    getChartVisitsController,
    getChartCategoriesController
};
