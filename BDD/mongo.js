const { MongoClient } = require('mongodb');

let client;
let placesCollection;
let userVisitsCollection;

const connectMongo = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI manquante');
        client = client || new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db(process.env.MONGO_DB_NAME || 'Pangeas');
        placesCollection = db.collection('places');
        userVisitsCollection = db.collection('user_visits');
        await placesCollection.createIndex(
            { submission_id: 1 },
            {
                unique: true,
                partialFilterExpression: { submission_id: { $type: 'number' } },
                name: 'unique_user_submission'
            }
        );
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
