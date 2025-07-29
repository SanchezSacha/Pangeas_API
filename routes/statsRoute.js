// routes/statsRoute.js
const express = require('express');
const router = express.Router();
const { getUserStats } = require('../controllers/statsController');

router.get('/', getUserStats);

module.exports = router;
