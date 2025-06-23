const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectMongo = require('./BDD/mongo');
const mysql = require('./BDD/mysql');

const app = express();
const placesRoutes = require('./routes/placesRoute');
const authRoute = require('./routes/authRoute');

app.use(cors());
app.use(express.json());
app.use('/accueil', placesRoutes);
app.use('/api/inscription', authRoute);

app.get('/', (req, res) => {
    res.send('Bienvenue sur l’API Pangeas');
});

connectMongo()
    .then(() => {
        app.listen(3000, () => {
            console.log('🚀 Serveur lancé sur http://localhost:3000');
        });
    })
    .catch((err) => {
        console.error('Erreur de connexion Mongo, arrêt du serveur', err);
    });

