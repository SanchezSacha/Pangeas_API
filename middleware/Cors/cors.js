const cors = require('cors');

const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
};
console.log('🔄 CORS headers appliqués');

module.exports = cors(corsOptions);
