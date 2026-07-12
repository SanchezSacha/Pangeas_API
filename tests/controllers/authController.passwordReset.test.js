const bcrypt = require('bcrypt');
const { getUserByEmail, updateUserPassword } = require('../../models/userModel');
const {
    createPasswordResetToken,
    markUnusedPasswordResetTokensAsUsed,
    getValidPasswordResetToken,
    markPasswordResetTokenAsUsed
} = require('../../models/passwordResetModel');
const { sendPasswordResetEmail } = require('../../services/mailService');
const { requestPasswordReset, resetPassword } = require('../../controllers/authController');

jest.mock('../../models/userModel');
jest.mock('../../models/passwordResetModel');
jest.mock('../../services/mailService');
jest.mock('../../models/settingsModel', () => ({
    createDefaultUserSettings: jest.fn().mockResolvedValue()
}));

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('password reset', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            body: {}
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        process.env.FRONTEND_RESET_PASSWORD_URL = 'http://localhost:5173/reset-password';
        jest.clearAllMocks();
    });

    describe('requestPasswordReset', () => {
        it('renvoie une reponse generique si aucun utilisateur ne correspond', async () => {
            req.body.email = 'missing@example.com';
            getUserByEmail.mockImplementation((email, cb) => cb(null, null));

            requestPasswordReset(req, res);
            await flushPromises();

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.'
            });
            expect(createPasswordResetToken).not.toHaveBeenCalled();
            expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('cree un token et envoie un email si le compte existe', async () => {
            req.body.email = 'TEST@example.com';
            const user = {
                id: 7,
                email: 'test@example.com',
                is_active: 1,
                status: 'active'
            };

            getUserByEmail.mockImplementation((email, cb) => cb(null, user));
            markUnusedPasswordResetTokensAsUsed.mockImplementation((userId, cb) => cb(null));
            createPasswordResetToken.mockImplementation((userId, tokenHash, expiresAt, cb) => cb(null));
            sendPasswordResetEmail.mockResolvedValue({ messageId: 'mail-1' });

            requestPasswordReset(req, res);
            await flushPromises();

            expect(getUserByEmail).toHaveBeenCalledWith('test@example.com', expect.any(Function));
            expect(markUnusedPasswordResetTokensAsUsed).toHaveBeenCalledWith(7, expect.any(Function));
            expect(createPasswordResetToken).toHaveBeenCalledWith(
                7,
                expect.stringMatching(/^[a-f0-9]{64}$/),
                expect.any(Date),
                expect.any(Function)
            );
            expect(sendPasswordResetEmail).toHaveBeenCalledWith({
                to: 'test@example.com',
                resetUrl: expect.stringMatching(/^http:\/\/localhost:5173\/reset-password\?token=[a-f0-9]{64}$/)
            });
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('resetPassword', () => {
        it('refuse un token invalide ou expire', async () => {
            req.body = {
                token: 'a'.repeat(64),
                password: 'nouveauMotDePasse123',
                confirmPassword: 'nouveauMotDePasse123'
            };
            getValidPasswordResetToken.mockImplementation((tokenHash, cb) => cb(null, null));

            resetPassword(req, res);
            await flushPromises();

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Le lien de reinitialisation est invalide ou expire.'
            });
            expect(updateUserPassword).not.toHaveBeenCalled();
        });

        it('met a jour le mot de passe et marque le token comme utilise', async () => {
            req.body = {
                token: 'b'.repeat(64),
                password: 'nouveauMotDePasse123',
                confirmPassword: 'nouveauMotDePasse123'
            };
            getValidPasswordResetToken.mockImplementation((tokenHash, cb) => cb(null, { id: 3, user_id: 7 }));
            bcrypt.hash.mockResolvedValue('hashed-password');
            updateUserPassword.mockImplementation((userId, hashedPassword, cb) => cb(null));
            markPasswordResetTokenAsUsed.mockImplementation((id, cb) => cb(null));

            resetPassword(req, res);
            await flushPromises();

            expect(updateUserPassword).toHaveBeenCalledWith(7, 'hashed-password', expect.any(Function));
            expect(markPasswordResetTokenAsUsed).toHaveBeenCalledWith(3, expect.any(Function));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Mot de passe reinitialise avec succes.'
            });
        });
    });
});
