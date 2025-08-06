const { ObjectId } = require('mongodb');
const { getPlacesCollection } = require('../BDD/mongo');

/**
 * Récupère un lieu par son ID
 * @param {string} id - ID du lieu (format string)
 * @returns {Promise<Object|null>}
 */
const getAllPlaces = async () => {
    try {
        const collection = getPlacesCollection();
        return await collection.find().toArray();
    } catch (err) {
        console.error("Erreur récupération lieux :", err);
        return [];
    }
};

const getPlaceById = async (id) => {
    try {
        const objectId = new ObjectId(id);
        const collection = getPlacesCollection();
        return await collection.findOne({ _id: objectId });
    } catch (err) {
        console.error("Erreur lors de la récupération du lieu:", err);
        return null;
    }
};

module.exports = { getPlaceById, getAllPlaces };
