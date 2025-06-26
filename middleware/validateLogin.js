const { check, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const validateLogin = [
    check('email')
        .trim()
        .notEmpty().withMessage('L’email est requis')
        .isEmail().withMessage('L’email doit être valide')
        .customSanitizer(value => sanitizeHtml(value)),

    check('password')
        .notEmpty().withMessage('Le mot de passe est requis'),

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

module.exports = validateLogin;
