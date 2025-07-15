const express = require('express');
const router = express.Router();

const validateUser = require('../middleware/validateUser');
const validateLogin = require('../middleware/validateLogin');
const handleMulterError = require('../middleware/validateMulter');
const uploadAvatar = require('../middleware/uploadAvatar');

const { registerUser, loginUser, getCurrentUser  } = require('../controllers/authController');

// Inscription
router.post('/inscription', (req, res, next) =>
        uploadAvatar.single('avatar')(req, res, (err) => {
            if (err) return handleMulterError(err, req, res, next);
            next();
        }), validateUser, registerUser
);

// Connexion
router.post('/connexion', validateLogin, loginUser);

// Sauvegarde Session
router.get('/me', getCurrentUser);

module.exports = router;
