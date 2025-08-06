const { updateUser } = require('../../controllers/authController');
const { getUserById, updateUserById } = require('../../models/userModel');
const path = require('path');
const fs = require('fs');

jest.mock('../../models/userModel');
jest.mock('fs');

describe('updateUser', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            session: { user: { id: 1 } },
            body: { pseudo: 'nouveau', bio: 'bio' },
            file: null
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        jest.clearAllMocks();
    });

    it('retourne 401 si pas d’utilisateur en session', () => {
        req.session.user = null;
        updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Non autorisé.' });
    });

    it('retourne 403 si tentative modification email, password ou role', () => {
        req.body.email = 'hack@hack.com';
        updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Modification non autorisée.' });
    });

    it('retourne 500 si erreur ou utilisateur non trouvé au premier getUserById', () => {
        getUserById.mockImplementation((id, cb) => cb(new Error('fail'), null));
        updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Utilisateur introuvable.' });
    });

    it('retourne 500 si erreur updateUserById', () => {
        getUserById.mockImplementationOnce((id, cb) => cb(null, { avatar_url: '/img-avatar.jpg' }));
        updateUserById.mockImplementation((id, data, cb) => cb(new Error('fail')));
        updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Erreur serveur.' });
    });

    it('retourne 500 si erreur ou utilisateur non trouvé au second getUserById', () => {
        getUserById.mockImplementationOnce((id, cb) => cb(null, { avatar_url: '/img-avatar.jpg' }));
        updateUserById.mockImplementation((id, data, cb) => cb(null, {}));
        getUserById.mockImplementationOnce((id, cb) => cb(new Error('fail'), null));
        updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Utilisateur introuvable après mise à jour.' });
    });

    it('réussit la mise à jour sans fichier avatar', () => {
        const userBeforeUpdate = { avatar_url: '/img-avatar.jpg' };
        const updatedUser = { id: 1, pseudo: 'nouveau', avatar_url: '/img-avatar.jpg', bio: 'bio', role: 'user' };

        getUserById.mockImplementationOnce((id, cb) => cb(null, userBeforeUpdate));
        updateUserById.mockImplementation((id, data, cb) => cb(null, {}));
        getUserById.mockImplementationOnce((id, cb) => cb(null, updatedUser));

        updateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Profil mis à jour.',
            user: {
                id: 1,
                pseudo: 'nouveau',
                avatar_url: '/img-avatar.jpg',
                bio: 'bio',
                role: 'user'
            }
        });
    });

    it('réussit la mise à jour avec suppression ancien avatar', () => {
        req.file = { filename: 'newAvatar.jpg' };
        const userBeforeUpdate = { avatar_url: '/uploads/avatar/oldAvatar.jpg' };
        const updatedUser = { id: 1, pseudo: 'nouveau', avatar_url: '/uploads/avatar/newAvatar.jpg', bio: 'bio', role: 'user' };

        getUserById.mockImplementationOnce((id, cb) => cb(null, userBeforeUpdate));
        updateUserById.mockImplementation((id, data, cb) => cb(null, {}));
        getUserById.mockImplementationOnce((id, cb) => cb(null, updatedUser));
        fs.unlink.mockImplementation((path, cb) => cb(null));

        updateUser(req, res);

        expect(fs.unlink).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Profil mis à jour.',
            user: {
                id: 1,
                pseudo: 'nouveau',
                avatar_url: '/uploads/avatar/newAvatar.jpg',
                bio: 'bio',
                role: 'user'
            }
        });
    });
});
