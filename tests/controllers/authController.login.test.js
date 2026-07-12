const {getUserByEmail} = require("../../models/userModel");
const {loginUser} = require("../../controllers/authController");
const bcrypt = require("bcrypt");

jest.mock('../../models/userModel');

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('loginUser', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            body: {
                email: 'test@example.com',
                password: 'motdepasse',
            },
            session: {
                save: jest.fn((cb) => cb(null)),
                user: null,
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    it('devrait renvoyer une erreur 500 si getUserByEmail renvoie une erreur', async () => {
        getUserByEmail.mockImplementation((email, cb) => cb(new Error('DB error'), null));

        loginUser(req, res);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Erreur serveur.'
        });
    });

    it('devrait renvoyer 401 si aucun utilisateur trouvé', async () => {
        getUserByEmail.mockImplementation((email, cb) => cb(null, null));

        loginUser(req, res);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            errors: [{ field: 'email', message: 'Aucun compte trouvé avec cet email.' }]
        });
    });

    it('devrait renvoyer 401 si le mot de passe est incorrect', async () => {
        const fakeUser = { password: 'hashedpwd' };
        getUserByEmail.mockImplementation((email, cb) => cb(null, fakeUser));
        bcrypt.compare.mockResolvedValue(false);

        loginUser(req, res);
        await flushPromises();

        expect(bcrypt.compare).toHaveBeenCalledWith('motdepasse', 'hashedpwd');
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            errors: [{ field: 'password', message: 'Mot de passe incorrect.' }]
        });
    });

    it('devrait réussir la connexion et sauvegarder la session', async () => {
        const fakeUser = {
            id: 1,
            email: 'test@example.com',
            pseudo: 'Testeur',
            avatar_url: '/avatar.jpg',
            bio: 'bio',
            role: 'user',
            password: 'hashedpwd',
        };
        getUserByEmail.mockImplementation((email, cb) => cb(null, fakeUser));
        bcrypt.compare.mockResolvedValue(true);

        loginUser(req, res);
        await flushPromises();

        expect(req.session.user).toEqual({
            id: 1,
            email: 'test@example.com',
            pseudo: 'Testeur',
            avatar_url: '/avatar.jpg',
            bio: 'bio',
            role: 'user',
        });
        expect(req.session.save).toHaveBeenCalled();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Connexion réussie.',
            user: req.session.user,
        });
    });

    it('devrait renvoyer 500 si erreur lors de la sauvegarde de session', async () => {
        const fakeUser = {
            id: 1,
            email: 'test@example.com',
            pseudo: 'Testeur',
            avatar_url: '/avatar.jpg',
            bio: 'bio',
            role: 'user',
            password: 'hashedpwd',
        };
        getUserByEmail.mockImplementation((email, cb) => cb(null, fakeUser));
        bcrypt.compare.mockResolvedValue(true);

        // Simuler erreur lors de save
        req.session.save.mockImplementationOnce(cb => cb(new Error('Session error')));

        loginUser(req, res);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Erreur de session.'
        });
    });
});
