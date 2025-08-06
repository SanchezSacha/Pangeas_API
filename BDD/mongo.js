const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let placesCollection;

const connectMongo = async () => {
    try {
        await client.connect();
        const db = client.db(process.env.MONGO_DB_NAME || 'Pangeas');
        placesCollection = db.collection('places');
        console.log('Connexion à MongoDB réussie');
    } catch (error) {
        console.error('Échec de la connexion à MongoDB :', error.message);
    }
};

const getPlacesCollection = () => {
    if (!placesCollection) {
        throw new Error("placesCollection non initialisée");
    }
    return placesCollection;
};

module.exports = {
    connectMongo,
    getPlacesCollection
};
