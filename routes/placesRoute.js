const express = require('express');
const router = express.Router();
const { getAllPlaces, getPlaceById } = require('../models/placesModel');
const { ObjectId } = require('mongodb');
const { sanitizePlaceOutput } = require('../utils/placeSecurity');

router.get('/', async (req, res) => {
    try {
        const places = await getAllPlaces();
        res.json(places.map(sanitizePlaceOutput));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Identifiant de lieu invalide.' });
        }
        const place = await getPlaceById(req.params.id);
        if (!place) return res.status(404).json({ success: false, message: "Lieu introuvable" });
        res.json({ success: true, place: sanitizePlaceOutput(place) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

module.exports = router;
