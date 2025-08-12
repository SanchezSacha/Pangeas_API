const db = require('../BDD/mysql');

// Vérifie s'il y a une visite en cours (n'importe quel lieu)
const getOngoingVisitByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM user_visits 
            WHERE user_id = ? AND status = 'ongoing'
        `;
        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || null);
        });
    });
};

// Vérifie si une visite est en cours pour ce lieu précis
const getOngoingVisitByPlaceAndUser = (userId, placeId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM user_visits
            WHERE user_id = ? AND place_id = ? AND status = 'ongoing'
            LIMIT 1
        `;
        db.query(query, [userId, placeId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || null);
        });
    });
};

// Marque la visite comme "visited" avec distance
const markVisitAsValidated = (visitId, distanceKm) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE user_visits
            SET status = 'visited',
                validated_at = NOW(),
                distance_km = ?
            WHERE id = ?
        `;
        db.query(query, [distanceKm, visitId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

// Démarre une nouvelle visite
const startVisit = (userId, placeId) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO user_visits (user_id, place_id, status)
            VALUES (?, ?, 'ongoing')
        `;
        db.query(query, [userId, placeId], (err, result) => {
            if (err) return reject(err);

            const newVisit = {
                id: result.insertId,
                user_id: userId,
                place_id: placeId,
                status: 'ongoing'
            };
            resolve(newVisit);
        });
    });
};

// Annule une visite en cours pour un utilisateur
const deleteVisitByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            DELETE FROM user_visits
            WHERE user_id = ? AND status = 'ongoing'
        `;
        db.query(query, [userId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

// Met à jour les statistiques utilisateur après une visite validée
const updateUserStats = (userId, distanceKm, placeType) => {
    return new Promise((resolve, reject) => {
        const fieldMap = {
            nature: 'nature_count',
            urbain: 'urban_count',
            historique: 'historical_count',
            secret: 'secret_count',
            frisson: 'spooky_count'
        };
        const typeField = fieldMap[placeType];
        if (!typeField) {
            return reject(new Error(`Type de lieu inconnu : ${placeType}`));
        }
        const query = `
            INSERT INTO user_stats (user_id, total_km, total_places, ${typeField})
            VALUES (?, ?, 1, 1)
            ON DUPLICATE KEY UPDATE
                total_km = total_km + VALUES(total_km),
                total_places = total_places + 1,
                ${typeField} = ${typeField} + 1
        `;
        db.query(query, [userId, distanceKm], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const getTotalVisited = () => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT COUNT(*) AS count FROM user_visits WHERE status = 'visited'";
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            resolve(results[0].count);
        });
    });
};

// Récupère les lieux "visité"
const getVisitedPlacesByUser = (userId, limit = 10, offset = 0) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT place_id, validated_at 
            FROM user_visits 
            WHERE user_id = ? AND status = 'visited'
            ORDER BY validated_at DESC
            LIMIT ? OFFSET ?
        `;
        db.query(query, [userId, limit, offset], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};
// Compte le nombre de lieux "visité"
const countVisitedPlacesByUser = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) AS total 
            FROM user_visits 
            WHERE user_id = ? AND status = 'visited'
        `;
        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0].total);
        });
    });
};

module.exports = {
    getOngoingVisitByUserId,
    getOngoingVisitByPlaceAndUser,
    startVisit,
    markVisitAsValidated,
    deleteVisitByUserId,
    updateUserStats,
    getTotalVisited,
    getVisitedPlacesByUser,
    countVisitedPlacesByUser
};
