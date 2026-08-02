const { csrfProtection, getCsrfToken } = require('../../middleware/csrfProtection');

describe('csrfProtection', () => {
    const originalEnvironment = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
        process.env.NODE_ENV = originalEnvironment;
    });

    test('crée un jeton lié à la session', () => {
        const req = { session: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        getCsrfToken(req, res);
        expect(req.session.csrfToken).toHaveLength(64);
        expect(res.json).toHaveBeenCalledWith({ success: true, csrfToken: req.session.csrfToken });
    });

    test('refuse une mutation sans jeton', () => {
        const req = { method: 'POST', session: { csrfToken: 'a'.repeat(64) }, get: jest.fn() };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        csrfProtection(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('accepte une mutation avec le jeton de la session', () => {
        const token = 'a'.repeat(64);
        const req = { method: 'POST', session: { csrfToken: token }, get: jest.fn().mockReturnValue(token) };
        const next = jest.fn();
        csrfProtection(req, {}, next);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
