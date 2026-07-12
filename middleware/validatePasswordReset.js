const { check } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const handleValidationErrors = require('./handleValidationErrors');

const validateForgotPassword = [
    check('email')
        .trim()
        .notEmpty().withMessage('L email est requis').bail()
        .isEmail().withMessage('L email doit etre valide')
        .customSanitizer(value => sanitizeHtml(value)),

    handleValidationErrors
];

const validateResetPassword = [
    check('token')
        .trim()
        .notEmpty().withMessage('Le token est requis')
        .isLength({ min: 64, max: 64 }).withMessage('Le token est invalide')
        .matches(/^[a-f0-9]+$/i).withMessage('Le token est invalide'),

    check('password')
        .notEmpty().withMessage('Le mot de passe est requis').bail()
        .isLength({ min: 12 }).withMessage('12 caracteres min'),

    check('confirmPassword')
        .notEmpty().withMessage('La confirmation du mot de passe est requise').bail()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Les mots de passe ne correspondent pas');
            }
            return true;
        }),

    handleValidationErrors
];

module.exports = {
    validateForgotPassword,
    validateResetPassword
};
