const { promises: fs } = require('fs');

const isJpeg = bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
const isPng = bytes => Buffer.from(bytes.subarray(0, 8)).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
);
const isWebp = bytes => bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';

module.exports = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const fileContent = await fs.readFile(req.file.path);
        const bytes = fileContent.subarray(0, 12);

        if (isJpeg(bytes) || isPng(bytes) || isWebp(bytes)) return next();

        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
            success: false,
            errors: [{ field: 'avatar', message: 'Le contenu du fichier image est invalide.' }]
        });
    } catch (error) {
        await fs.unlink(req.file.path).catch(() => {});
        next(error);
    }
};
