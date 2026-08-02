const multer = require('multer');
const path = require('path');
const fs = require('fs');

const allowedMimeTypes = Object.freeze({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
});

const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatar');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = allowedMimeTypes[file.mimetype];
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 }, // 1 Mo
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedTypes.includes(ext) || !allowedMimeTypes[file.mimetype]) {
            return cb(new Error('Format de fichier non valide'));
        }
        cb(null, true);
    }
});

module.exports = upload;
