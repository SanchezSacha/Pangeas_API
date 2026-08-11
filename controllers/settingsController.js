const bcrypt = require('bcrypt');
const { verifyPassword, hashPassword, authenticateDeletion  } = require('../utils/authHelper');
const path = require('path');
const { unlink } = require('fs');
const { anonymizeAccount, anonymizeUserData, getUserDataForExport  } = require('../models/accountModel');
const { updateGeolocationSetting, getGeolocationSetting, markDataAsExported } = require('../models/settingsModel');
const {
    getUserById,
    getUserByEmail,
    updateUserEmail,
    updateUserPassword
} = require('../models/userModel');

////////////////// UPDATE EMAIL ///////////////////////////////////////////////

exports.updateEmail = (req, res) => {
    const { newEmail, password } = req.body;
    const userId = req.session.user.id;

    getUserById(userId, async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
        }
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    errors: [{ field: "password", message: "Mot de passe incorrect" }]
                });
            }
            getUserByEmail(newEmail, (err, existingUser) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Erreur serveur." });
                }
                if (existingUser && existingUser.id !== user.id) {
                    return res.status(409).json({
                        success: false,
                        errors: [{ field: "newEmail", message: "Email déjà utilisé" }]
                    });
                }
                updateUserEmail(userId, newEmail, (err) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: "Erreur lors de la mise à jour de l’email." });
                    }
                    req.session.user.email = newEmail;
                    return res.status(200).json({
                        success: true,
                        message: "Email mis à jour avec succès.",
                        email: newEmail
                    });
                });
            });
        } catch (error) {
            console.error("Erreur de comparaison du mot de passe :", error);
            return res.status(500).json({ success: false, message: "Erreur serveur." });
        }
    });
};

//////////////////// UPDATE PASSWORD //////////////////////////////////////

exports.updatePassword = (req, res) => {
    const userId = req.session.user.id;
    const { currentPassword, newPassword } = req.body;

    getUserById(userId, async (err, user) => {
        if (err || !user) {
            return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
        }
        try {
            const isMatch = await verifyPassword(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    errors: [{ field: 'currentPassword', message: 'Mot de passe actuel incorrect.' }]
                });
            }
            const hashedNewPassword = await hashPassword(newPassword);

            updateUserPassword(userId, hashedNewPassword, (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Erreur lors de la mise à jour du mot de passe." });
                }

                return res.status(200).json({
                    success: true,
                    message: "Mot de passe mis à jour avec succès."
                });
            });
        } catch (error) {
            console.error("Erreur lors de la mise à jour du mot de passe :", error);
            return res.status(500).json({ success: false, message: "Erreur serveur." });
        }
    });
};

const removePersonalAvatar = (avatarUrl) => {
    if (!avatarUrl || avatarUrl === '/img-avatar.jpg') {
        return;
    }
    const avatarPath = path.join(__dirname, '..', avatarUrl.replace(/^\/+/, ''));
    unlink(avatarPath, (err) => {
        if (err) {
            console.error("Erreur suppression avatar anonymise :", err);
        }
    });
};

const closeSessionAfterAnonymization = (req, res, message) => {
    req.session.destroy(err => {
        if (err) console.error("Erreur destruction session :", err);
        res.clearCookie(process.env.SESSION_COOKIE_NAME || 'pangeas.sid', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.SESSION_SAME_SITE || 'lax'
        });
        return res.status(200).json({ success: true, message });
    });
};

//////// ANONYMISATION DU COMPTE //////////

exports.deleteAccount = (req, res) => {
    const userId = req.session.user?.id;
    const { email, password } = req.body;

    authenticateDeletion(userId, email, password, async (err) => {
        if (err) {
            return res.status(err.code).json({ success: false, ...(err.message ? { message: err.message } : { errors: err.errors }) });
        }
        try {
            const { previousAvatarUrl } = await anonymizeAccount(userId);
            removePersonalAvatar(previousAvatarUrl);
            return closeSessionAfterAnonymization(req, res, "Compte anonymise avec succes.");
        } catch (error) {
            console.error("Erreur lors de la suppression du compte :", error);
            return res.status(500).json({ success: false, message: "Erreur serveur." });
        }
    });
};

/////////////// ANONYMISATION DES DONNEES ////////////////////

exports.deleteUserData = (req, res) => {
    const userId = req.session.user?.id;
    const { email, password } = req.body;

    authenticateDeletion(userId, email, password, async (err) => {
        if (err) {
            return res.status(err.code).json({ success: false, ...(err.message ? { message: err.message } : { errors: err.errors }) });
        }
        try {
            const { previousAvatarUrl } = await anonymizeUserData(userId);
            removePersonalAvatar(previousAvatarUrl);
            return closeSessionAfterAnonymization(req, res, "Donnees personnelles anonymisees avec succes.");
        } catch (error) {
            console.error("Erreur lors de la suppression des données :", error);
            return res.status(500).json({ success: false, message: "Erreur serveur." });
        }
    });
};

///////////////// EXPORTATION DES DONNEES ////////////////////

exports.exportUserData = async (req, res) => {
    const userId = req.session.user?.id;
    const download = req.query.download === 'true';
    if (!userId) {
        return res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
    }
    try {
        const data = await getUserDataForExport(userId);
        await markDataAsExported(userId);
        const json = JSON.stringify(data, null, 2);
        if (download) {
            const filename = `export-user-${userId}.json`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/json');
            return res.send(json);
        }
        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error("Erreur lors de l’export des données :", error);
        return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
};

/////// VERIFICATION EMAIL POUR UPDATE PASSWORD ////////////////

exports.verifyPasswordIdentity = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            errors: [
                { field: 'email', message: 'Email requis' },
                { field: 'password', message: 'Mot de passe requis' }
            ]
        });
    }

    getUserByEmail(email, async (err, user) => {
        if (err || !user) {
            return res.status(404).json({
                success: false,
                errors: [{ field: 'email', message: "Aucun utilisateur trouvé avec cet email" }]
            });
        }

        try {
            const isMatch = await verifyPassword(password, user.password);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    errors: [{ field: 'password', message: 'Mot de passe incorrect' }]
                });
            }

            if (user.id !== req.session.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "Vous ne pouvez pas modifier ce compte."
                });
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Erreur vérification identité :", error);
            return res.status(500).json({ success: false, message: "Erreur serveur." });
        }
    });
};
