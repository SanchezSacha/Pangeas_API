const express = require('express');
const router = express.Router();
const { startUserVisit } = require('../controllers/visitController');
const { validateVisit } = require('../middleware/validateVisit');
const { cancelVisit, getOngoingVisit, getVisitedPlaces   } = require('../controllers/visitController');

router.post('/start', startUserVisit);
router.get('/ongoing', getOngoingVisit);
router.post('/validate', validateVisit);
router.delete('/cancel', cancelVisit);
// Récupération des lieux qui ont été visités
router.get('/visited', getVisitedPlaces);

module.exports = router;
