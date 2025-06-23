const bcrypt = require('bcrypt');
const { createUser } = require('../models/userModel');
const path = require('path');

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
                console.error('❌ Erreur lors de l’enregistrement :', err);
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

module.exports = { registerUser };
