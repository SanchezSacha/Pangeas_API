const { registerUser } = require('../../controllers/authController');
const { createUser } = require('../../models/userModel');

jest.mock('../../models/userModel');

describe('registerUser', () => {
    it('devrait renvoyer un succès si l’utilisateur est créé', async () => {
        const req = {
            body: {
                pseudo: 'Testeur',
                email: 'test@example.com',
                password: 'motdepasse',
                bio: 'bio',
                cgu_accepted: true,
            },
            file: null
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        createUser.mockImplementation((data, callback) => {
            callback(null, { insertId: 1 });
        });

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Inscription réussie. Veuillez vous connecter.',
        });
    });

    it('devrait renvoyer une erreur si createUser échoue', async () => {
        const req = {
            body: {
                pseudo: 'Testeur',
                email: 'test@example.com',
                password: 'motdepasse',
                bio: 'bio',
                cgu_accepted: true,
            },
            file: null
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        createUser.mockImplementation((data, callback) => {
            callback(new Error('DB error'), null);
        });

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Erreur lors de l’inscription. Veuillez réessayer plus tard.",
        });
    });
});





