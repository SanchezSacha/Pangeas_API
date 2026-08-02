const favoriteModel = require('../models/favoriteModel');
const { getPlacesCollection } = require('../BDD/mongo');
const { ObjectId } = require('mongodb');
const { sanitizePlaceOutput } = require('../utils/placeSecurity');

exports.addFavorite = async (req, res) => {
    const userId = req.session.user?.id;
    const { placeId } = req.body;

    if (!userId || !ObjectId.isValid(placeId)) {
        return res.status(400).json({ success: false, message: 'Identifiant de lieu invalide.' });
    }
    try {
        const placeExists = await getPlacesCollection().findOne({ _id: new ObjectId(placeId) }, { projection: { _id: 1 } });
        if (!placeExists) return res.status(404).json({ success: false, message: 'Lieu introuvable.' });

        const alreadyFavorite = await favoriteModel.existsFavorite(userId, placeId);
        if (alreadyFavorite) {
            return res.json({ success: true, favorited: true });
        }

        await favoriteModel.addFavorite(userId, placeId);
        res.json({ success: true, favorited: true });
    } catch (error) {
        console.error('Erreur addFavorite:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.deleteFavorite = async (req, res) => {
    const userId = req.session.user?.id;
    const placeId = req.params.placeId;

    if (!userId || !ObjectId.isValid(placeId)) {
        return res.status(400).json({ success: false, message: 'Identifiant de lieu invalide.' });
    }
    try {
        await favoriteModel.removeFavorite(userId, placeId);
        res.json({ success: true, favorited: false });
    } catch (error) {
        console.error('Erreur deleteFavorite:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

exports.getFavorites = async (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non autorisé' });

    try {
        const favorites = await favoriteModel.getFavoritesByUser(userId);
        const placeIds = favorites.filter(f => ObjectId.isValid(f.place_id)).map(f => new ObjectId(f.place_id));

        const placesCollection = getPlacesCollection();
        const places = await placesCollection.find({ _id: { $in: placeIds } }).toArray();

        const orderedPlaces = placeIds.map(id =>
            places.find(place => place._id.toString() === id.toString())
        ).filter(Boolean);

        res.json({ success: true, favorites: orderedPlaces.map(sanitizePlaceOutput) });
    } catch (error) {
        console.error('Erreur getFavorites:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

