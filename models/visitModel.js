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

module.exports = {getOngoingVisitByUserId, getOngoingVisitByPlaceAndUser, startVisit, markVisitAsValidated, deleteVisitByUserId};
