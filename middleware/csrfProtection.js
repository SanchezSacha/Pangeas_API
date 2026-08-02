const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_SESSION_KEY = 'csrfToken';

const createCsrfToken = () => crypto.randomBytes(32).toString('hex');

const ensureCsrfToken = req => {
    if (!req.session[TOKEN_SESSION_KEY]) {
        req.session[TOKEN_SESSION_KEY] = createCsrfToken();
    }
    return req.session[TOKEN_SESSION_KEY];
};

const getCsrfToken = (req, res) => {
    res.status(200).json({ success: true, csrfToken: ensureCsrfToken(req) });
};

const csrfProtection = (req, res, next) => {
    if (process.env.NODE_ENV === 'test' || SAFE_METHODS.has(req.method)) return next();

    const expectedToken = req.session?.[TOKEN_SESSION_KEY];
    const receivedToken = req.get('X-CSRF-Token');

    if (!expectedToken || !receivedToken) {
        return res.status(403).json({ success: false, message: 'Jeton CSRF manquant ou expiré.' });
    }

    const expected = Buffer.from(expectedToken);
    const received = Buffer.from(receivedToken);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        return res.status(403).json({ success: false, message: 'Jeton CSRF invalide.' });
    }

    next();
};

module.exports = { csrfProtection, getCsrfToken };
