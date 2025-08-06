const db = require('../BDD/mysql');

const createDefaultUserSettings = async (userId) => {
    await db.promise().query(
        `INSERT INTO user_settings (user_id) VALUES (?)`,
        [userId]
    );
};

const markDataAsExported = async (userId) => {
    await db.promise().query(
        `UPDATE user_settings SET data_exported = 1 WHERE user_id = ?`,
        [userId]
    );
};

const deleteSettingsByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM user_settings WHERE user_id = ?`;
        db.query(query, [userId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

module.exports = {
    deleteSettingsByUserId,
    createDefaultUserSettings,
    markDataAsExported
};
