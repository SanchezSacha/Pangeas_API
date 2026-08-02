const userAdminModel = require('../../models/admin/userAdminModel');
const { cleanPlainText } = require('../../utils/placeSecurity');

const normalizeUserId = value => {
    const userId = Number(value);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await userAdminModel.getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Erreur getAllUsers :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const userId = normalizeUserId(req.params.id);
        if (!userId) return res.status(400).json({ error: 'Identifiant utilisateur invalide.' });
        const userDetails = await userAdminModel.getUserDetailsById(userId);
        res.json(userDetails);
    } catch (err) {
        console.error('Erreur getUserDetails :', err.message || err);
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const userId = normalizeUserId(req.params.id);
        const pseudo = cleanPlainText(req.body.pseudo, 100);
        const email = String(req.body.email || '').trim().toLowerCase();
        const role = String(req.body.role || '').trim().toLowerCase();

        if (!userId || pseudo.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Données utilisateur invalides.' });
        }

        await userAdminModel.updateUserById(userId, { pseudo, email, role });
        res.json({ message: 'Utilisateur mis à jour avec succès' });
    } catch (err) {
        console.error('Erreur updateUser :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = normalizeUserId(req.params.id);
        if (!userId) return res.status(400).json({ error: 'Identifiant utilisateur invalide.' });
        await userAdminModel.deleteUserAndData(userId);
        res.json({ message: 'Utilisateur anonymise avec succes' });
    } catch (err) {
        console.error('Erreur deleteUser :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
