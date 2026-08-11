jest.mock('../../BDD/prisma', () => ({
    user: { findUnique: jest.fn() }
}));

const prisma = require('../../BDD/prisma');
const requireAuth = require('../../middleware/requireAuth');
const { isAdmin } = require('../../middleware/admin/isAdmin');

describe('middlewares d authentification Prisma', () => {
    const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

    beforeEach(() => jest.clearAllMocks());

    test('rafraichit une session active depuis Prisma', async () => {
        const req = { session: { user: { id: 5 } } };
        const res = response();
        const next = jest.fn();
        prisma.user.findUnique.mockResolvedValue({
            id: 5,
            email: 'a@example.com',
            pseudo: 'A',
            avatarUrl: null,
            bio: null,
            role: 'user',
            isActive: true,
            status: 'active'
        });

        await requireAuth(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.session.user).toEqual(expect.objectContaining({ id: 5, role: 'user' }));
    });

    test('refuse un utilisateur non administrateur', async () => {
        const req = { session: { user: { id: 5 } } };
        const res = response();
        prisma.user.findUnique.mockResolvedValue({ role: 'user', isActive: true, status: 'active' });

        await isAdmin(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(403);
    });
});
