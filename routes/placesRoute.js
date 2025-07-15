const express = require('express');
const router = express.Router();
const { Place } = require('../models/placesModel');

router.get('/', async (req, res) => {
    try {
        const places = await Place.find();
        res.json(places);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
