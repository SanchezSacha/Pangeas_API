const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/donationController');

const router = express.Router();

router.use(requireAuth);
router.get('/campaigns', controller.list);
router.get('/mine', controller.history);
router.post('/campaigns/:id/redeem', controller.redeem);

module.exports = router;
