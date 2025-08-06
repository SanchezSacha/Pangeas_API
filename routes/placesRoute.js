const express = require('express');
const router = express.Router();
const { getAllPlaces, getPlaceById } = require('../models/placesModel');

router.get('/', async (req, res) => {
    try {
        const places = await getAllPlaces();
        res.json(places);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const place = await getPlaceById(req.params.id);
        if (!place) return res.status(404).json({ success: false, message: "Lieu introuvable" });
        res.json({ success: true, place });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

module.exports = router;
