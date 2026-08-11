const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadPlaceSubmissionPhotos = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 5,
        fileSize: 2 * 1024 * 1024,
        fields: 10,
        fieldSize: 16 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return callback(new Error('UNSUPPORTED_PLACE_PHOTO'));
        }
        callback(null, true);
    }
});

const handlePlacePhotoUpload = (req, res, next) => {
    uploadPlaceSubmissionPhotos.array('photos', 5)(req, res, error => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'Chaque photo doit peser au maximum 2 Mo.'
                : 'La demande doit contenir au maximum 5 photos.';
            return res.status(400).json({ success: false, code: error.code, message });
        }

        if (error.message === 'UNSUPPORTED_PLACE_PHOTO') {
            return res.status(400).json({
                success: false,
                code: 'UNSUPPORTED_PHOTO_TYPE',
                message: 'Seules les images JPEG, PNG et WebP sont acceptees.'
            });
        }

        next(error);
    });
};

module.exports = { handlePlacePhotoUpload };
