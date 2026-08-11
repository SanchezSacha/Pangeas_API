const prisma = require('../BDD/prisma');

const listNotifications = async (userId, { unreadOnly, page, limit }) => {
    const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
        prisma.internalNotification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.internalNotification.count({ where }),
        prisma.internalNotification.count({ where: { userId, readAt: null } })
    ]);
    return { notifications, total, unread, page, limit, totalPages: Math.ceil(total / limit) };
};

const markNotificationRead = async (userId, notificationId) => {
    const result = await prisma.internalNotification.updateMany({
        where: { id: notificationId, userId, readAt: null },
        data: { readAt: new Date() }
    });
    if (result.count === 1) return true;
    return Boolean(await prisma.internalNotification.findFirst({
        where: { id: notificationId, userId },
        select: { id: true }
    }));
};

module.exports = { listNotifications, markNotificationRead };
