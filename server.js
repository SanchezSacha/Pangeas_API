require('dotenv').config();
const express = require('express');
const session = require('express-session');

const connectMongo = require('./BDD/mongo');
const mysql = require('./BDD/mysql');
const corsMiddleware = require('./middleware/Cors/cors');

const app = express();
const cors = require('cors');

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
        secure: false,
        sameSite: 'lax',
    }
}));

// Routes
const placesRoutes = require('./routes/placesRoute');
const authRoute = require('./routes/authRoute');
const visitRoutes = require('./routes/visitRoute');
app.use('/accueil', placesRoutes);
app.use('/api/auth', authRoute);
app.use('/api/visit', visitRoutes);


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
