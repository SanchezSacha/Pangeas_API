const { check, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const handleValidationErrors = require('./handleValidationErrors');


const validateUpdate = [
    check('pseudo')
        .optional()
        .trim()
        .notEmpty().withMessage('Le pseudo ne peut pas être vide')
        .isLength({ min: 2 }).withMessage('2 caractères min')
        .customSanitizer(value => sanitizeHtml(value)),

    check('bio')
        .optional()
        .isLength({ max: 150 }).withMessage('150 caractères max')
        .customSanitizer(value => sanitizeHtml(value)),

    handleValidationErrors
];

module.exports = validateUpdate;
