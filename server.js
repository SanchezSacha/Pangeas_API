require('dotenv').config();
const express = require('express');
const session = require('express-session');

const connectMongo = require('./BDD/mongo');
const mysql = require('./BDD/mysql');
const corsMiddleware = require('./middleware/Cors/cors');

const app = express();

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 2,
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
    }
}));

// Middleware
app.use(corsMiddleware);
app.use(express.json());

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const placesRoutes = require('./routes/placesRoute');
const authRoute = require('./routes/authRoute');
const visitRoutes = require('./routes/visitRoute');
const favoriteRoute = require('./routes/favoriteRoute');
const statsRoute = require('./routes/statsRoute');

app.use('/accueil', placesRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/auth', authRoute);
app.use('/api/visit', visitRoutes);
app.use('/api/favorites', favoriteRoute);
app.use('/api/stats', statsRoute);

app.get('/', (req, res) => {
    res.send('Bienvenue sur l’API Pangeas');
});

// Lancement API
connectMongo()
    .then(() => {
        app.listen(3000, () => {
            console.log('Serveur lancé sur http://localhost:3000');
        });
    })
    .catch((err) => {
        console.error('Erreur de connexion Mongo, arrêt du serveur', err);
    });
