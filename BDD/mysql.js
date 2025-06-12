const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

db.connect((err) => {
    if (err) {
        console.error('❌ Connexion MySQL échouée :', err.message);
    } else {
        console.log('✅ Connexion à MySQL réussie');
    }
});

module.exports = db;
