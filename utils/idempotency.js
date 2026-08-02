const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/;

const getIdempotencyKey = req => {
    const value = String(req.get('Idempotency-Key') || '').trim();
    return IDEMPOTENCY_KEY_PATTERN.test(value) ? value : null;
};

module.exports = { getIdempotencyKey };
