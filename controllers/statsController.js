const { getStatsByUserId } = require('../models/statsModel');

const getUserStats = async (req, res) => {
    const userId = req.session?.user?.id;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Non authentifié." });
    }

    try {
        const stats = await getStatsByUserId(userId);
        return res.status(200).json({ success: true, stats });
    } catch (err) {
        console.error("Erreur dans getUserStats :", err);
        return res.status(500).json({ success: false, message: "Erreur serveur." });
    }
};

module.exports = { getUserStats };
