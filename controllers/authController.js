const bcrypt = require('bcrypt');
const { createUser, getUserByEmail, getUserById, updateUserById} = require('../models/userModel');
const path = require('path');
const {unlink} = require("fs");

//////////////////////////////////////////////////////////INSCRIPTION//////////////////////////////////////////////////////////////
const registerUser = async (req, res) => {
    try {
        const { pseudo, email, password, bio, cgu_accepted } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        let avatarUrl;
        if (req.file) {
            avatarUrl = `/uploads/avatar/${req.file.filename}`;
        } else {
            avatarUrl = '/img-avatar.jpg';
        }

        const userData = [
            pseudo,
            email,
            hashedPassword,
            bio || null,
            avatarUrl,
            'user',
            true,
        ];

        createUser(userData, (err, result) => {
            if (err) {
                console.error('Erreur lors de l’enregistrement :', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l’inscription. Veuillez réessayer plus tard.'
                });
            }
            return res.status(201).json({
                success: true,
                message: 'Inscription réussie. Veuillez vous connecter.'
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur serveur.'
        });
    }
};

////////////////////////////////// Update user ////////////////////////////////////////////////////////
const updateUser = (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Non autorisé.' });
    }

    if ('email' in req.body || 'password' in req.body || 'role' in req.body) {
        return res.status(403).json({ success: false, message: 'Modification non autorisée.' });
    }

    const userId = req.session.user.id;
    const { pseudo, bio } = req.body;
    let avatar_url;

    if (req.file) {
        avatar_url = `/uploads/avatar/${req.file.filename}`;
    }

    getUserById(userId, (err, userBeforeUpdate) => {
        if (err || !userBeforeUpdate) {
            return res.status(500).json({ success: false, message: 'Utilisateur introuvable.' });
        }

        updateUserById(userId, { pseudo, bio, avatar_url }, (err, result) => {
            if (err) {
                console.error('Erreur lors de la mise à jour utilisateur :', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur.' });
            }

            if (req.file && userBeforeUpdate.avatar_url && userBeforeUpdate.avatar_url !== '/img-avatar.jpg') {
                const oldAvatarPath = path.join(__dirname, '..', userBeforeUpdate.avatar_url.replace(/^\/+/, ''));
                unlink(oldAvatarPath, (err) => {
                    if (err) {
                        console.error("Erreur suppression ancien avatar :", err);
                    }
                });
            }

            getUserById(userId, (err, updatedUser) => {
                if (err || !updatedUser) {
                    return res.status(500).json({ success: false, message: 'Utilisateur introuvable après mise à jour.' });
                }

                req.session.user = {
                    id: updatedUser.id,
                    pseudo: updatedUser.pseudo,
                    avatar_url: updatedUser.avatar_url,
                    bio: updatedUser.bio,
                    role: updatedUser.role
                };
                return res.status(200).json({
                    success: true,
                    message: 'Profil mis à jour.',
                    user: req.session.user
                });
            });
        });
    });
};
//////////////////////////////////////////////////////////CONNEXION//////////////////////////////////////////////////////////////
const loginUser = (req, res) => {
    const { email, password } = req.body;

    getUserByEmail(email, async (err, user) => {
        if (err) {
            console.error('❌ Erreur lors de la recherche utilisateur :', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur serveur.'
            });
        }
        if (!user) {
            return res.status(401).json({
                success: false,
                errors: [{ field: 'email', message: 'Aucun compte trouvé avec cet email.' }]
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                errors: [{ field: 'password', message: 'Mot de passe incorrect.' }]
            });
        }
        req.session.user = {
            id: user.id,
            pseudo: user.pseudo,
            avatar_url: user.avatar_url,
            bio: user.bio,
            role: user.role
        };
        req.session.save(err => {
            if (err) {
                console.error('Erreur lors de la sauvegarde de la session', err);
                return res.status(500).json({ success: false, message: 'Erreur de session.' });
            }
            return res.status(200).json({
                success: true,
                message: 'Connexion réussie.',
                user: req.session.user
            });
        });

    });
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////Sauvegarde la session si pas de déconnexion ://////////////////////////////////////////////////

const getCurrentUser = (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).json({
            success: true,
            user: req.session.user
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'Aucun utilisateur connecté.'
        });
    }
};

module.exports = { registerUser, loginUser, getCurrentUser, updateUser  };
