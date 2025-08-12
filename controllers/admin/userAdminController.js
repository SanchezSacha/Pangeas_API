const userAdminModel = require('../../models/admin/userAdminModel');

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
        const userId = req.params.id;
        const userDetails = await userAdminModel.getUserDetailsById(userId);
        res.json(userDetails);
    } catch (err) {
        console.error('Erreur getUserDetails :', err.message || err);
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { pseudo, email, role } = req.body;

        await userAdminModel.updateUserById(userId, { pseudo, email, role });
        res.json({ message: 'Utilisateur mis à jour avec succès' });
    } catch (err) {
        console.error('Erreur updateUser :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await userAdminModel.deleteUserAndData(userId);
        res.json({ message: 'Utilisateur et données supprimés' });
    } catch (err) {
        console.error('Erreur deleteUser :', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
