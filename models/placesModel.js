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

module.exports = mongoose.model('Place', placeSchema);
