const multer = require('multer');

module.exports = function handleMulterError(err, req, res, next) {
    if (err instanceof multer.MulterError || err.message.includes("limite")) {
        return res.status(400).json({
            success: false,
            errors: [{ field: 'avatar', message: 'Le fichier ne doit pas dépasser 1 Mo.' }]
        });
    }
    if (err.message === 'Format de fichier non valide') {
        return res.status(400).json({
            success: false,
            errors: [{ field: 'avatar', message: err.message }]
        });
    }
    next(err);
};
