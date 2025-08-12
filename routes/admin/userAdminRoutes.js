const express = require('express');
const router = express.Router();
const userAdminController = require('../../controllers/admin/userAdminController');
const { isAdmin } = require('../../middleware/admin/isAdmin');

router.get('/users', isAdmin, userAdminController.getAllUsers);
router.get('/users/:id', isAdmin, userAdminController.getUserDetails);
router.delete('/users/:id', isAdmin, userAdminController.deleteUser);
router.put('/users/:id', isAdmin, userAdminController.updateUser);

module.exports = router;
