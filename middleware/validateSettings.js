const { check } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const handleValidationErrors = require('./handleValidationErrors');

exports.validateEmailUpdate = [
    check('newEmail')
        .trim()
        .notEmpty().withMessage('L’email est requis')
        .isEmail().withMessage('L’email doit être valide')
        .customSanitizer(value => sanitizeHtml(value)),

    check('password')
        .notEmpty().withMessage('Mot de passe requis'),

    handleValidationErrors
];

exports.validatePasswordUpdate = [
    check('currentPassword')
        .notEmpty().withMessage('Mot de passe actuel requis'),

    check('newPassword')
        .isLength({ min: 12 }).withMessage('12 caractères minimum'),

    check('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Les mots de passe ne correspondent pas');
            }
            return true;
        }),

    handleValidationErrors
];
