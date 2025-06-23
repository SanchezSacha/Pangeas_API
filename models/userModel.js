const db = require('../BDD/mysql');

const createUser = (userData, callback) => {
    const query = `
    INSERT INTO users (pseudo, email, password, bio, avatar_url, role, cgu_accepted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
    db.query(query, userData, callback);
};

module.exports = { createUser };