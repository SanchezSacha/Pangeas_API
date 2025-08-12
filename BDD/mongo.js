const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let placesCollection;
let userVisitsCollection;

const connectMongo = async () => {
    try {
        await client.connect();
        const db = client.db(process.env.MONGO_DB_NAME || 'Pangeas');
        placesCollection = db.collection('places');
        userVisitsCollection = db.collection('user_visits');
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

const getUserVisitsCollection = () => {
    if (!userVisitsCollection) {
        throw new Error("userVisitsCollection non initialisée");
    }
    return userVisitsCollection;
};

module.exports = {
    connectMongo,
    getPlacesCollection,
    getUserVisitsCollection
};
