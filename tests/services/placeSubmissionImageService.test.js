const sharp = require('sharp');
const {
    processSubmissionPhotos,
    deleteSubmissionFiles,
    getPrivatePhotoPath
} = require('../../services/placeSubmissionImageService');

describe('traitement des photos de propositions', () => {
    let processed = [];

    afterEach(async () => {
        await deleteSubmissionFiles(processed);
        processed = [];
    });

    test('reecrit une image valide en WebP et cree une miniature', async () => {
        const buffer = await sharp({
            create: { width: 40, height: 30, channels: 3, background: '#336699' }
        }).jpeg().withMetadata({ orientation: 6 }).toBuffer();

        processed = await processSubmissionPhotos([{ buffer }]);
        const imageMetadata = await sharp(getPrivatePhotoPath(processed[0])).metadata();
        const thumbnailMetadata = await sharp(getPrivatePhotoPath(processed[0], true)).metadata();

        expect(processed[0]).toEqual(expect.objectContaining({
            mimeType: 'image/webp',
            orderIndex: 0,
            status: 'pending'
        }));
        expect(imageMetadata.format).toBe('webp');
        expect(imageMetadata.exif).toBeUndefined();
        expect(thumbnailMetadata.width).toBe(400);
        expect(thumbnailMetadata.height).toBe(400);
    });

    test('refuse un contenu qui n est pas une image', async () => {
        await expect(processSubmissionPhotos([{ buffer: Buffer.from('<script>') }]))
            .rejects.toThrow('INVALID_IMAGE_CONTENT');
    });
});
