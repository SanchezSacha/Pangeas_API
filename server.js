require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const connectMongo = require('./BDD/mongo');
const mysql = require('./BDD/mysql');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2,
        httpOnly: true,
        secure: false // true si HTTPS
    }
}));

// Routes
const placesRoutes = require('./routes/placesRoute');
const authRoute = require('./routes/authRoute');
app.use('/accueil', placesRoutes);
app.use('/api/auth', authRoute);

app.get('/', (req, res) => {
    res.send('Bienvenue sur l’API Pangeas');
});

// Lancement API
connectMongo()
    .then(() => {
        app.listen(3000, () => {
            console.log('🚀 Serveur lancé sur http://localhost:3000');
        });
    })
    .catch((err) => {
        console.error('Erreur de connexion Mongo, arrêt du serveur', err);
    });
