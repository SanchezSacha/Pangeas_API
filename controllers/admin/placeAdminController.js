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
const getAllPlacesController = async (req, res) => {
    try {
        const places = await getAllPlaces();
        res.status(200).json(places);
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

        res.status(200).json(place);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération du lieu.' });
    }
};
const createPlaceController = async (req, res) => {
    try {
        const {
            name,
            department,
            region,
            category,
            description,
            legend,
            anecdote,
            activities,
            image_url,
            coordinates,
            distance_km
        } = req.body;

        if (
            !name || !department || !region || !category || !description ||
            !legend || !anecdote || !activities || !image_url || !coordinates || distance_km == null
        ) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }

        const newPlace = {
            name: name.trim(),
            department: department.trim(),
            region: region.trim(),
            category: category.trim(),
            description: description.trim(),
            legend: legend.trim(),
            anecdote: anecdote.trim(),
            activities: Array.isArray(activities) ? activities.map(a => a.trim()) : [],
            image_url: image_url.trim(),
            coordinates,
            distance_km: parseFloat(distance_km),
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

        const {
            name,
            department,
            region,
            category,
            description,
            legend,
            anecdote,
            activities,
            image_url,
            coordinates,
            distance_km
        } = req.body;

        if (
            !name || !department || !region || !category || !description ||
            !legend || !anecdote || !activities || !image_url || !coordinates || distance_km == null
        ) {
            return res.status(400).json({ error: 'Tous les champs sont requis.' });
        }

        const updatedData = {
            name: name.trim(),
            department: department.trim(),
            region: region.trim(),
            category: category.trim(),
            description: description.trim(),
            legend: legend.trim(),
            anecdote: anecdote.trim(),
            activities: Array.isArray(activities) ? activities.map(a => a.trim()) : [],
            image_url: image_url.trim(),
            coordinates,
            distance_km: parseFloat(distance_km)
        };

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
