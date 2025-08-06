const express = require('express');
const router = express.Router();
const { getUserStats } = require('../controllers/statsController');
const requireAuth = require('../middleware/requireAuth');


router.get('/',requireAuth ,getUserStats);

module.exports = router;
