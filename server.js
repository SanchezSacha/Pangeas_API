require('dotenv').config();
const express = require('express');
const session = require('express-session');

const { connectMongo } = require('./BDD/mongo');
const mysql = require('./BDD/mysql');
const corsMiddleware = require('./middleware/Cors/cors');
const { csrfProtection } = require('./middleware/csrfProtection');
const securityHeaders = require('./middleware/securityHeaders');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || (isProduction && sessionSecret === 'change_me_with_a_long_random_secret')) {
    throw new Error('SESSION_SECRET doit être une valeur longue et secrète en production.');
}

if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(securityHeaders);

// Session
app.use(session({
    name: process.env.SESSION_COOKIE_NAME || 'pangeas.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: Number(process.env.SESSION_MAX_AGE_MS) || 1000 * 60 * 60 * 2,
        httpOnly: true,
        secure: isProduction,
        sameSite: process.env.SESSION_SAME_SITE || 'lax',
    }
}));

// Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(csrfProtection);

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const placesRoutes = require('./routes/placesRoute');
const authRoute = require('./routes/authRoute');
const visitRoutes = require('./routes/visitRoute');
const favoriteRoute = require('./routes/favoriteRoute');
const statsRoute = require('./routes/statsRoute');
const settingsRoute = require('./routes/settingsRoute');
const pointRoute = require('./routes/pointRoute');
const rewardRoute = require('./routes/rewardRoute');
const donationRoute = require('./routes/donationRoute');
const placeSubmissionRoute = require('./routes/placeSubmissionRoute');
const notificationRoute = require('./routes/notificationRoute');
// Admin
const adminUserRoutes = require('./routes/admin/userAdminRoutes');
const adminPlacesRoutes = require('./routes/admin/placeAdminRoutes');
const adminRewardRoutes = require('./routes/admin/rewardAdminRoutes');
const adminPlaceSubmissionRoutes = require('./routes/admin/placeSubmissionAdminRoutes');

app.use('/accueil', placesRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/auth', authRoute);
app.use('/api/visit', visitRoutes);
app.use('/api/favorites', favoriteRoute);
app.use('/api/stats', statsRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/points', pointRoute);
app.use('/api/rewards', rewardRoute);
app.use('/api/donations', donationRoute);
app.use('/api/place-submissions', placeSubmissionRoute);
app.use('/api/notifications', notificationRoute);
// Admin
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin/places', adminPlacesRoutes);
app.use('/api/admin', adminRewardRoutes);
app.use('/api/admin/place-submissions', adminPlaceSubmissionRoutes);




app.get('/', (req, res) => {
    res.send('Bienvenue sur l’API Pangeas');
});
connectMongo()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Serveur lancé sur http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Erreur de connexion Mongo, arrêt du serveur', err);
    });
