const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
    name: String,
    department: String,
    region: String,
    category: String,
    description: String,
    legend: String,
    anecdote: String,
    activities: [String],
    image_url: String,
    coordinates: {
        lat: Number,
        lng: Number
    },
    distance_km: Number,
    created_at: Date
});

const Place = mongoose.model('Place', placeSchema);

const getPlaceById = async (id) => {
    try {
        return await Place.findById(id).lean();
    } catch (err) {
        console.error("Erreur lors de la récupération du lieu:", err);
        return null;
    }
};

module.exports = {Place, getPlaceById};
