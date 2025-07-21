const { check, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

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

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }
        next();
    }
];

module.exports = validateUpdate;
