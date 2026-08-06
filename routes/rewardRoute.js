const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const rewardController = require('../controllers/rewardController');

const router = express.Router();

router.use(requireAuth);
router.get('/', rewardController.list);
router.get('/mine', rewardController.history);
router.get('/:id', rewardController.getOne);
router.post('/:id/redeem', rewardController.redeem);

module.exports = router;
