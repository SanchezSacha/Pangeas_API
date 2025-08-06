const { check, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const handleValidationErrors = require('./handleValidationErrors');

const validateLogin = [
    check('email')
        .trim()
        .notEmpty().withMessage('L’email est requis')
        .isEmail().withMessage('L’email doit être valide')
        .customSanitizer(value => sanitizeHtml(value)),

    check('password')
        .notEmpty().withMessage('Le mot de passe est requis'),

    handleValidationErrors
];

module.exports = validateLogin;
