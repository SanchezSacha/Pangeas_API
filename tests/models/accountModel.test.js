jest.mock('../../BDD/prisma', () => ({
    $transaction: jest.fn()
}));

jest.mock('../../BDD/mongo', () => ({
    getPlacesCollection: jest.fn()
}));

const prisma = require('../../BDD/prisma');
const { anonymizeAccount, anonymizeUserData } = require('../../models/accountModel');

const createTransactionMock = () => ({
    user: {
        findUnique: jest.fn().mockResolvedValue({ id: 7, avatarUrl: '/uploads/avatar/user.jpg' }),
        update: jest.fn().mockResolvedValue({ id: 7 })
    },
    userSettings: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    passwordResetToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    syncEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    internalNotification: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    pointAccount: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    userVisit: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    donation: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    couponCode: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }
});

describe('accountModel anonymisation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('anonymise les donnees personnelles sans effacer les statistiques utiles', async () => {
        const tx = createTransactionMock();
        prisma.$transaction.mockImplementation(callback => callback(tx));

        const result = await anonymizeUserData(7);

        expect(result.previousAvatarUrl).toBe('/uploads/avatar/user.jpg');
        expect(tx.userSettings.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(tx.pointAccount.updateMany).toHaveBeenCalledWith({
            where: { userId: 7 },
            data: { availablePoints: 0 }
        });
        expect(tx.userVisit.updateMany).toHaveBeenCalledWith({
            where: { userId: 7 },
            data: {
                clientEventId: null,
                gpsAccuracyM: null,
                validationLat: null,
                validationLng: null
            }
        });
        expect(tx.donation.updateMany).toHaveBeenCalledWith({
            where: { userId: 7 },
            data: { message: null }
        });
        expect(tx.user.update).toHaveBeenCalledWith({
            where: { id: 7 },
            data: expect.objectContaining({
                pseudo: 'Utilisateur anonymise 7',
                bio: null,
                avatarUrl: '/img-avatar.jpg',
                isActive: false,
                status: 'anonymized'
            })
        });
    });

    it('marque une suppression de compte avec le statut deleted', async () => {
        const tx = createTransactionMock();
        prisma.$transaction.mockImplementation(callback => callback(tx));

        await anonymizeAccount(7);

        expect(tx.user.update).toHaveBeenCalledWith({
            where: { id: 7 },
            data: expect.objectContaining({
                status: 'deleted',
                deletedAt: expect.any(Date),
                anonymizedAt: expect.any(Date)
            })
        });
    });
});
