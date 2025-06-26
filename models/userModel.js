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

module.exports = {
    createUser,
    getUserByEmail
};
