const { listNotifications, markNotificationRead } = require('../models/notificationModel');

const list = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    try {
        return res.status(200).json({
            success: true,
            ...(await listNotifications(req.session.user.id, {
                unreadOnly: req.query.unread === '1',
                page,
                limit
            }))
        });
    } catch (error) {
        console.error('Erreur liste notifications :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger les notifications.' });
    }
};

const read = async (req, res) => {
    const notificationId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return res.status(400).json({ success: false, message: 'Notification invalide.' });
    }
    try {
        const found = await markNotificationRead(req.session.user.id, notificationId);
        if (!found) return res.status(404).json({ success: false, message: 'Notification introuvable.' });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Erreur lecture notification :', error);
        return res.status(500).json({ success: false, message: 'Impossible de marquer la notification comme lue.' });
    }
};

module.exports = { list, read };
