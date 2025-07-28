const mongoose = require('mongoose');

const connectMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connexion à MongoDB réussie');
    } catch (error) {
        console.error('Échec de la connexion à MongoDB :', error.message);
    }
};

module.exports = connectMongo;
