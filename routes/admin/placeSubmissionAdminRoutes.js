const express = require('express');
const { isAdmin } = require('../../middleware/admin/isAdmin');
const controller = require('../../controllers/admin/placeSubmissionAdminController');

const router = express.Router();
router.use(isAdmin);
router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/:id/request-changes', controller.requestChanges);
router.post('/:id/reject', controller.reject);
router.post('/:id/publish', controller.publish);

module.exports = router;
