const db = require('../BDD/mysql');

const createUser = (userData, callback) => {
    const query = `
        INSERT INTO users (pseudo, email, password, bio, avatar_url, role, cgu_accepted)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, userData, callback);
};

const getUserByEmail = (email, callback) => {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.query(query, [email], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        return callback(null, results[0]);
    });
};

const getUserById = (id, callback) => {
    const query = `SELECT * FROM users WHERE id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        return callback(null, results[0]);
    });
};

const getTotalUsers = () => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT COUNT(*) AS count FROM users';
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            resolve(results[0].count);
        });
    });
};

const updateUserById = (id, { pseudo, bio, avatar_url }, callback) => {
    const fields = [];
    const values = [];

    if (pseudo !== undefined) {
        fields.push('pseudo = ?');
        values.push(pseudo);
    }
    if (bio !== undefined) {
        fields.push('bio = ?');
        values.push(bio);
    }
    if (avatar_url !== undefined) {
        fields.push('avatar_url = ?');
        values.push(avatar_url);
    }
    if (fields.length === 0) {
        return callback(null, null);
    }
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.query(query, values, callback);
};

const updateUserEmail = (id, newEmail, callback) => {
    const query = `UPDATE users SET email = ? WHERE id = ?`;
    db.query(query, [newEmail, id], callback);
};

const updateUserPassword = (id, hashedPassword, callback) => {
    const query = `UPDATE users SET password = ? WHERE id = ?`;
    db.query(query, [hashedPassword, id], callback);
};

const deleteUserById = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM users WHERE id = ?`;
        db.query(query, [userId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
    getTotalUsers,
    updateUserById,
    updateUserEmail,
    updateUserPassword,
    deleteUserById
};
