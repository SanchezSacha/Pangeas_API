const db = require('../BDD/mysql');

const getStatsByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT total_km, total_places, nature_count, urban_count, historical_count, secret_count, spooky_count
            FROM user_stats
            WHERE user_id = ?
            LIMIT 1
        `;

        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);

            if (results.length === 0) {
                return resolve({
                    total_km: 0,
                    total_places: 0,
                    nature_count: 0,
                    urban_count: 0,
                    historical_count: 0,
                    secret_count: 0,
                    spooky_count: 0
                });
            }

            resolve(results[0]);
        });
    });
};

module.exports = { getStatsByUserId };
