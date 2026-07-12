jest.mock('../../../BDD/prisma', () => ({
    user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
    }
}));

jest.mock('../../../models/accountModel', () => ({
    anonymizeAccount: jest.fn()
}));

const prisma = require('../../../BDD/prisma');
const userAdminModel = require('../../../models/admin/userAdminModel');

describe('userAdminModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('retourne les compteurs utiles pour les statistiques back office', async () => {
        const createdAt = new Date('2026-07-01T10:00:00.000Z');
        const updatedAt = new Date('2026-07-02T10:00:00.000Z');

        prisma.user.findMany.mockResolvedValue([
            {
                id: 7,
                pseudo: 'Utilisateur anonymise 7',
                email: 'anonymized-7@example.local',
                role: 'user',
                status: 'deleted',
                isActive: false,
                anonymizedAt: updatedAt,
                deletedAt: updatedAt,
                createdAt,
                updatedAt,
                pointAccount: {
                    totalPoints: 850,
                    availablePoints: 0
                },
                _count: {
                    favorites: 4,
                    donations: 2,
                    visits: 12
                }
            }
        ]);

        const users = await userAdminModel.getAllUsers();

        expect(users).toEqual([
            {
                id: 7,
                pseudo: 'Utilisateur anonymise 7',
                email: 'anonymized-7@example.local',
                role: 'user',
                status: 'deleted',
                is_active: false,
                anonymized_at: updatedAt,
                deleted_at: updatedAt,
                created_at: createdAt,
                updated_at: updatedAt,
                favorites_count: 4,
                donations_count: 2,
                total_points: 850,
                available_points: 0,
                visited_places_count: 12
            }
        ]);
    });
});
