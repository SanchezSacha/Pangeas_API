const mysql = require('mysql2');

let db;

if (process.env.NODE_ENV !== 'test') {
    db = mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Connexion MySQL échouée :', err.message);
        } else {
            console.log('Connexion à MySQL réussie');
            connection.release();
        }
    });
} else {
    db = null;
}

module.exports = db;
