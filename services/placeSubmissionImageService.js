const crypto = require('crypto');
const path = require('path');
const { promises: fs } = require('fs');
const sharp = require('sharp');

const privateRoot = path.join(__dirname, '..', 'private_uploads', 'place-submissions');
const imageDirectory = path.join(privateRoot, 'images');
const thumbnailDirectory = path.join(privateRoot, 'thumbnails');
const publicPlaceDirectory = path.join(__dirname, '..', 'uploads', 'places');

const ensureDirectories = () => Promise.all([
    fs.mkdir(imageDirectory, { recursive: true }),
    fs.mkdir(thumbnailDirectory, { recursive: true })
]);

const safeStorageName = value => path.basename(String(value || ''));

const processOne = async (file, orderIndex) => {
    const identifier = crypto.randomUUID();
    const imageName = `${identifier}.webp`;
    const thumbnailName = `${identifier}-thumb.webp`;
    const imagePath = path.join(imageDirectory, imageName);
    const thumbnailPath = path.join(thumbnailDirectory, thumbnailName);

    try {
        const pipeline = sharp(file.buffer, {
            failOn: 'error',
            limitInputPixels: 25_000_000
        }).rotate();

        const metadata = await pipeline.metadata();
        if (!metadata.width || !metadata.height) throw new Error('INVALID_IMAGE_CONTENT');

        const imageInfo = await pipeline
            .clone()
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(imagePath);

        await pipeline
            .clone()
            .resize({ width: 400, height: 400, fit: 'cover', position: 'centre' })
            .webp({ quality: 76 })
            .toFile(thumbnailPath);

        return {
            url: imageName,
            thumbnailUrl: thumbnailName,
            orderIndex,
            mimeType: 'image/webp',
            sizeBytes: imageInfo.size,
            width: imageInfo.width,
            height: imageInfo.height,
            status: 'pending'
        };
    } catch (error) {
        await Promise.all([
            fs.unlink(imagePath).catch(() => {}),
            fs.unlink(thumbnailPath).catch(() => {})
        ]);
        throw error;
    }
};

const deleteSubmissionFiles = async photos => {
    const paths = photos.flatMap(photo => [
        path.join(imageDirectory, safeStorageName(photo.url)),
        path.join(thumbnailDirectory, safeStorageName(photo.thumbnailUrl))
    ]);
    await Promise.all(paths.map(filePath => fs.unlink(filePath).catch(() => {})));
};

const processSubmissionPhotos = async files => {
    await ensureDirectories();
    const processed = [];

    try {
        for (const [index, file] of files.entries()) {
            processed.push(await processOne(file, index));
        }
        return processed;
    } catch (error) {
        await deleteSubmissionFiles(processed);
        if (error.message === 'INVALID_IMAGE_CONTENT') throw error;
        const invalidImageError = new Error('INVALID_IMAGE_CONTENT');
        invalidImageError.cause = error;
        throw invalidImageError;
    }
};

const getPrivatePhotoPath = (photo, thumbnail = false) => path.join(
    thumbnail ? thumbnailDirectory : imageDirectory,
    safeStorageName(thumbnail ? photo.thumbnailUrl : photo.url)
);

const promoteSubmissionPhotos = async photos => {
    await fs.mkdir(publicPlaceDirectory, { recursive: true });
    const urls = [];

    for (const photo of photos) {
        const fileName = safeStorageName(photo.url);
        const targetName = `submission-${photo.submissionId}-${fileName}`;
        await fs.copyFile(getPrivatePhotoPath(photo), path.join(publicPlaceDirectory, targetName));
        urls.push(`/uploads/places/${targetName}`);
    }

    return urls;
};

module.exports = {
    processSubmissionPhotos,
    deleteSubmissionFiles,
    getPrivatePhotoPath,
    promoteSubmissionPhotos
};
