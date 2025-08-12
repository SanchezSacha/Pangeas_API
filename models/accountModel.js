const db = require('../BDD/mysql');
const { ObjectId } = require('mongodb');
const { getPlacesCollection } = require('../BDD/mongo');

const deleteUserData = async (userId) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`DELETE FROM user_favorites WHERE user_id = ?`, [userId]);
        await connection.query(`DELETE FROM user_stats WHERE user_id = ?`, [userId]);
        await connection.query(`DELETE FROM user_settings WHERE user_id = ?`, [userId]);
        await connection.query(`DELETE FROM user_visits WHERE user_id = ?`, [userId]);

        await connection.commit();
        connection.release();
    } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
    }
};

const deleteAccountCompletely = async (userId) => {
    const connection = await db.promise().getConnection();
    try {
        await connection.beginTransaction();
        await deleteUserData(userId);
        await connection.query(`DELETE FROM users WHERE id = ?`, [userId]);

        await connection.commit();
        connection.release();
    } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
    }
};

const getUserDataForExport = async (userId) => {
    const [userRows] = await db.promise().query(`SELECT id, pseudo, email, bio, avatar_url, cgu_accepted, created_at FROM users WHERE id = ?`, [userId]);
    const [statsRows] = await db.promise().query(`SELECT * FROM user_stats WHERE user_id = ?`, [userId]);
    const [settingsRows] = await db.promise().query(`SELECT * FROM user_settings WHERE user_id = ?`, [userId]);
    const [favoritesRows] = await db.promise().query(`SELECT * FROM user_favorites WHERE user_id = ?`, [userId]);
    const [visitsRows] = await db.promise().query(`SELECT * FROM user_visits WHERE user_id = ?`, [userId]);

    const favoritePlaceIds = favoritesRows.map(fav => fav.place_id);
    const visitedPlaceIds = visitsRows.map(v => v.place_id);

    const allPlaceIds = [...new Set([...favoritePlaceIds, ...visitedPlaceIds])];

    let places = [];
    if (allPlaceIds.length > 0) {
        const objectIds = allPlaceIds.map(id => new ObjectId(id));
        const placesCollection = getPlacesCollection();
        places = await placesCollection.find({ _id: { $in: objectIds } }).toArray();
    }

    return {
        user: userRows[0] || {},
        stats: statsRows[0] || {},
        settings: settingsRows[0] || {},
        favorites: favoritesRows.map(fav => {
            return {
                ...fav,
                place: places.find(p => p._id.toString() === fav.place_id) || null
            };
        }),
        visits: visitsRows.map(visit => {
            return {
                ...visit,
                place: places.find(p => p._id.toString() === visit.place_id) || null
            };
        })
    };
};

module.exports = { deleteUserData, deleteAccountCompletely, getUserDataForExport };
