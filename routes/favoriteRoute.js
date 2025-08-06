const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const requireAuth = require('../middleware/requireAuth');


router.post('/', requireAuth ,favoriteController.addFavorite);
router.delete('/:placeId', requireAuth, favoriteController.deleteFavorite);
router.get('/', requireAuth, favoriteController.getFavorites);

module.exports = router;
