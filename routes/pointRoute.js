const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getSummary, getHistory, previewVisit } = require('../controllers/pointController');

const router = express.Router();

router.use(requireAuth);
router.get('/summary', getSummary);
router.get('/history', getHistory);
router.get('/visits/:placeId/preview', previewVisit);

module.exports = router;
