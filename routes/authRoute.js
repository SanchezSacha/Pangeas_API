const express = require('express');
const router = express.Router();

const validateUser = require('../middleware/validateUser');
const validateLogin = require('../middleware/validateLogin');
const uploadAvatar = require('../middleware/uploadAvatar');
const handleMulterError = require('../middleware/validateMulter');
const validateUpdate = require("../middleware/validateUpdate");
const { validateForgotPassword, validateResetPassword } = require('../middleware/validatePasswordReset');
const { registerUser, loginUser, getCurrentUser, updateUser, requestPasswordReset, resetPassword} = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');
const { getCsrfToken } = require('../middleware/csrfProtection');
const validateImageSignature = require('../middleware/validateImageSignature');


router.get('/csrf', getCsrfToken);

// Inscription
router.post('/inscription', (req, res, next) =>
        uploadAvatar.single('avatar')(req, res, (err) => {
            if (err) return handleMulterError(err, req, res, next);
            next();
        }), validateImageSignature, validateUser, registerUser
);

// Connexion
router.post('/connexion', validateLogin, loginUser);

// Mot de passe oublie
router.post('/forgot-password', validateForgotPassword, requestPasswordReset);
router.post('/reset-password', validateResetPassword, resetPassword);

// Update
router.put('/update', requireAuth, (req, res, next) =>
        uploadAvatar.single('avatar')(req, res, (err) => {
            if (err) return handleMulterError(err, req, res, next);
            next();
        }), validateImageSignature, validateUpdate, updateUser
);

// Sauvegarde Session
router.get('/me', requireAuth, getCurrentUser);

// Déconnexion
router.post('/logout', requireAuth, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erreur lors de la suppression de la session:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion.' });
        }
        res.clearCookie(process.env.SESSION_COOKIE_NAME || 'pangeas.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.SESSION_SAME_SITE || 'lax'
        });
        return res.status(200).json({ success: true, message: 'Déconnecté avec succès.' });
    });
});

module.exports = router;
