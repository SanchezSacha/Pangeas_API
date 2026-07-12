const db = require('../BDD/mysql');

const createPasswordResetToken = (userId, tokenHash, expiresAt, callback) => {
    const query = `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
    `;
    db.query(query, [userId, tokenHash, expiresAt], callback);
};

const markUnusedPasswordResetTokensAsUsed = (userId, callback) => {
    const query = `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = ? AND used_at IS NULL
    `;
    db.query(query, [userId], callback);
};

const getValidPasswordResetToken = (tokenHash, callback) => {
    const query = `
        SELECT id, user_id, expires_at
        FROM password_reset_tokens
        WHERE token_hash = ?
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
    `;
    db.query(query, [tokenHash], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        return callback(null, results[0]);
    });
};

const markPasswordResetTokenAsUsed = (id, callback) => {
    const query = `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = ? AND used_at IS NULL
    `;
    db.query(query, [id], callback);
};

module.exports = {
    createPasswordResetToken,
    markUnusedPasswordResetTokensAsUsed,
    getValidPasswordResetToken,
    markPasswordResetTokenAsUsed
};
