const favoriteModel = require('../models/favoriteModel');
const { Place } = require('../models/placesModel');
const { ObjectId } = require('mongodb');

exports.addFavorite = async (req, res) => {
    const userId = req.session.user?.id;
    const { placeId } = req.body;

    if (!userId || !placeId) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }
    try {
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

    if (!userId || !placeId) {
        return res.status(400).json({ success: false, message: 'Paramètres manquants' });
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
        const placeIds = favorites.map(f => new ObjectId(f.place_id));

        const places = await Place.find({ _id: { $in: placeIds } }).lean();

        const orderedPlaces = placeIds.map(id =>
            places.find(place => place._id.toString() === id.toString())
        ).filter(Boolean);

        res.json({ success: true, favorites: orderedPlaces });
    } catch (error) {
        console.error('Erreur getFavorites:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

