const express = require('express');
const router = express.Router();
const { startUserVisit } = require('../controllers/visitController');

router.post('/start', startUserVisit);

module.exports = router;
