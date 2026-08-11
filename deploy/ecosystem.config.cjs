const path = require('node:path');

const apiDirectory = process.env.PANGEAS_API_DIR || path.resolve(__dirname, '..');
const logDirectory = process.env.PANGEAS_LOG_DIR || '/var/log/pangeas';

module.exports = {
    apps: [
        {
            name: 'pangeas-api',
            cwd: apiDirectory,
            script: path.join(apiDirectory, 'server.js'),
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            max_memory_restart: '500M',
            time: true,
            out_file: path.join(logDirectory, 'api-out.log'),
            error_file: path.join(logDirectory, 'api-error.log'),
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
};
