const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const placeSubmissionRateLimit = (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const now = Date.now();
    if (attempts.size > 10_000) {
        for (const [storedKey, entry] of attempts) {
            if (entry.resetAt <= now) attempts.delete(storedKey);
        }
    }
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return next();
    }

    current.count += 1;
    if (current.count <= MAX_ATTEMPTS) return next();

    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Trop de tentatives. Reessayez dans quelques minutes.'
    });
};

module.exports = placeSubmissionRateLimit;
