const bcrypt = require('bcrypt');
const { getUserById } = require('../models/userModel');

/**
 * Compare un mot de passe en clair avec un mot de passe hashé
 */
const verifyPassword = async (inputPassword, hashedPassword) => {
    return await bcrypt.compare(inputPassword, hashedPassword);
};

/**
 * Hash un mot de passe avec un salt (par défaut 10)
 */
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

/**
 * Vérifie que l'utilisateur est bien authentifié
 * (suppression du compte ou des données)
 */
const authenticateDeletion = (userId, email, password, callback) => {
    if (!userId) {
        return callback({ code: 401, message: "Utilisateur non authentifié." });
    }
    if (!email || !password) {
        return callback({ code: 400, message: "Email et mot de passe requis." });
    }
    getUserById(userId, async (err, user) => {
        if (err || !user) {
            return callback({ code: 404, message: "Utilisateur introuvable." });
        }
        if (email !== user.email) {
            return callback({
                code: 403,
                errors: [{ field: "email", message: "L’email ne correspond pas à votre compte." }]
            });
        }
        const isMatch = await verifyPassword(password, user.password);
        if (!isMatch) {
            return callback({
                code: 401,
                errors: [{ field: "password", message: "Mot de passe incorrect." }]
            });
        }
        return callback(null);
    });
};

module.exports = {
    verifyPassword,
    hashPassword,
    authenticateDeletion
};
