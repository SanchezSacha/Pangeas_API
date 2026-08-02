const { promises: fs } = require('fs');
const os = require('os');
const path = require('path');
const validateImageSignature = require('../../middleware/validateImageSignature');

describe('validateImageSignature', () => {
    let testFile;

    afterEach(async () => {
        if (testFile) await fs.unlink(testFile).catch(() => {});
    });

    test('accepte une signature JPEG', async () => {
        testFile = path.join(os.tmpdir(), `pangeas-jpeg-${Date.now()}.jpg`);
        await fs.writeFile(testFile, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]));
        const next = jest.fn();

        await validateImageSignature({ file: { path: testFile } }, {}, next);
        expect(next).toHaveBeenCalledWith();
    });

    test('supprime un faux fichier image', async () => {
        testFile = path.join(os.tmpdir(), `pangeas-invalid-${Date.now()}.jpg`);
        await fs.writeFile(testFile, '<script>alert(1)</script>');
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        await validateImageSignature({ file: { path: testFile } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        await expect(fs.access(testFile)).rejects.toThrow();
        testFile = null;
    });
});
