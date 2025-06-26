const { check, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

const validateUser = [
    check('pseudo')
        .trim()
        .notEmpty().withMessage('Le pseudo est requis')
        .isLength({ min: 2 }).withMessage('2 caractères min')
        .customSanitizer(value => sanitizeHtml(value)),

    check('email')
        .trim()
        .notEmpty().withMessage('L’email est requis').bail()
        .isEmail().withMessage('L’email doit être valide')
        .customSanitizer(value => sanitizeHtml(value)),

    check('password')
        .notEmpty().withMessage('Le mot de passe est requis').bail()
        .isLength({ min: 12 }).withMessage('12 caractères min'),

    check('confirmPassword')
        .notEmpty().withMessage('La confirmation du mot de passe est requise').bail()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Les mots de passe ne correspondent pas');
            }
            return true;
        }),

    check('cgu_accepted')
        .exists().withMessage('Vous devez accepter les conditions générales')
        .equals('true').withMessage('Vous devez accepter les conditions générales'),

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

module.exports = validateUser;
