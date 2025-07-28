const db = require('../BDD/mysql'); // Ton instance mysql

const existsFavorite = async (userId, placeId) => {
    const [rows] = await db.promise().query(
        'SELECT id FROM user_favorites WHERE user_id = ? AND place_id = ?',
        [userId, placeId]
    );
    return rows.length > 0;
};

const getFavoritesByUser = async (userId) => {
    const [rows] = await db.promise().query(
        'SELECT place_id FROM user_favorites WHERE user_id = ? ORDER BY added_at DESC',
        [userId]
    );
    return rows;
};

const addFavorite = async (userId, placeId) => {
    return db.promise().query(
        'INSERT INTO user_favorites (user_id, place_id) VALUES (?, ?)',
        [userId, placeId]
    );
};

const removeFavorite = async (userId, placeId) => {
    return db.promise().query(
        'DELETE FROM user_favorites WHERE user_id = ? AND place_id = ?',
        [userId, placeId]
    );
};

module.exports = {existsFavorite, addFavorite, removeFavorite, getFavoritesByUser};
