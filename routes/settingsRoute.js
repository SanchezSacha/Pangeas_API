const express = require('express');
const router = express.Router();
const {validateEmailUpdate, validatePasswordUpdate} = require('../middleware/validateSettings');
const requireAuth = require('../middleware/requireAuth');
const validateLogin = require('../middleware/validateLogin');
const {
    updateEmail,
    updatePassword,
    deleteAccount,
    deleteUserData,
    exportUserData,
    verifyPasswordIdentity
} = require('../controllers/settingsController');


router.put('/email', requireAuth, validateEmailUpdate, updateEmail);
router.post('/verify-password', requireAuth, verifyPasswordIdentity);
router.put('/password', requireAuth, validatePasswordUpdate, updatePassword);
router.get('/export', requireAuth, exportUserData);
// Suppression des données
router.delete('/data', requireAuth, validateLogin, deleteUserData);
// Suppression complète du compte
router.delete('/delete', requireAuth, validateLogin, deleteAccount);

module.exports = router;
