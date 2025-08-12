const db = require('../../BDD/mysql');
const { ObjectId } = require('mongodb');

const getAllUsers = () => {
    const sql = `
        SELECT 
            users.id,
            users.pseudo,
            users.email,
            users.role,
            users.created_at,
            users.updated_at,
            COUNT(user_visits.id) AS visited_places_count
        FROM users
        LEFT JOIN user_visits ON users.id = user_visits.user_id AND user_visits.status = 'visited'
        GROUP BY users.id
        ORDER BY users.created_at DESC
    `;
    return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

const getUserDetailsById = (userId) => {
    return new Promise((resolve, reject) => {
        db.query('SELECT id, pseudo, email, bio, avatar_url, role, cgu_accepted, created_at, updated_at, is_active FROM users WHERE id = ?', [userId], (err, userResults) => {
            if (err) return reject(err);
            if (!userResults.length) return reject(new Error('Utilisateur non trouvé'));

            const user = userResults[0];

            db.query('SELECT place_id FROM user_visits WHERE user_id = ? AND status = "visited"', [userId], (err, visited) => {
                if (err) return reject(err);
                db.query('SELECT * FROM user_stats WHERE user_id = ?', [userId], (err, stats) => {
                    if (err) return reject(err);
                    db.query('SELECT * FROM user_favorites WHERE user_id = ?', [userId], (err, favorites) => {
                        if (err) return reject(err);
                        db.query('SELECT * FROM user_settings WHERE user_id = ?', [userId], (err, settings) => {
                            if (err) return reject(err);
                            resolve({
                                ...user,
                                visited_places: visited,
                                stats: stats[0] || null,
                                favorites_count: favorites.length,
                                settings: settings[0] || null
                            });
                        });
                    });
                });
            });
        });
    });
};

const updateUserById = (userId, { pseudo, email, role }) => {
    const sql = `
        UPDATE users 
        SET pseudo = ?, email = ?, role = ?, updated_at = NOW()
        WHERE id = ?
    `;
    return new Promise((resolve, reject) => {
        db.query(sql, [pseudo, email, role, userId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const deleteUserAndData = (userId) => {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM user_settings WHERE user_id = ?', [userId], (err) => {
            if (err) return reject(err);
            db.query('DELETE FROM user_stats WHERE user_id = ?', [userId], (err) => {
                if (err) return reject(err);
                db.query('DELETE FROM user_visits WHERE user_id = ?', [userId], (err) => {
                    if (err) return reject(err);
                    db.query('DELETE FROM user_favorites WHERE user_id = ?', [userId], (err) => {
                        if (err) return reject(err);
                        db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                });
            });
        });
    });
};

module.exports = {
    getAllUsers,
    getUserDetailsById,
    updateUserById,
    deleteUserAndData
};
