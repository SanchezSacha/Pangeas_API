const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectMongo = require('./BDD/mongo');
const mysql = require('./BDD/mysql');

const app = express();
const placesRoutes = require('./routes/placesRoute');

app.use(cors());
app.use(express.json());
app.use('/accueil', placesRoutes);

app.get('/', (req, res) => {
    res.send('Bienvenue sur l’API Pangeas 🧭');
});

// Démarrage du serveur qu’après connexion Mongo réussie.
connectMongo()
    .then(() => {
        app.listen(3000, () => {
            console.log('🚀 Serveur lancé sur http://localhost:3000');
        });
    })
    .catch((err) => {
        console.error('Erreur de connexion Mongo, arrêt du serveur', err);
    });

