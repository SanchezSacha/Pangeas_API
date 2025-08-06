const express = require('express');
const router = express.Router();
const { startUserVisit } = require('../controllers/visitController');
const { validateVisit } = require('../middleware/validateVisit');
const { cancelVisit, getOngoingVisit, getVisitedPlaces   } = require('../controllers/visitController');
const requireAuth = require('../middleware/requireAuth');


router.post('/start',requireAuth, startUserVisit);
router.get('/ongoing', requireAuth, getOngoingVisit);
router.post('/validate', requireAuth,validateVisit);
router.delete('/cancel', requireAuth, cancelVisit);
// Récupération des lieux qui ont été visités
router.get('/visited',requireAuth, getVisitedPlaces);

module.exports = router;
