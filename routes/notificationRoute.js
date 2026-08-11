const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { list, read } = require('../controllers/notificationController');

const router = express.Router();
router.use(requireAuth);
router.get('/', list);
router.post('/:id/read', read);

module.exports = router;
