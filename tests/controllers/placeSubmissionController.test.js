jest.mock('../../models/placeSubmissionModel', () => {
    class PlaceSubmissionError extends Error {}
    return {
        PlaceSubmissionError,
        createPlaceSubmission: jest.fn(),
        listUserPlaceSubmissions: jest.fn(),
        getUserPlaceSubmission: jest.fn(),
        resubmitPlaceSubmission: jest.fn(),
        cancelPlaceSubmission: jest.fn(),
        getRewardPreview: jest.fn(),
        getPhotoForViewer: jest.fn()
    };
});
jest.mock('../../services/placeSubmissionImageService', () => ({
    processSubmissionPhotos: jest.fn(),
    deleteSubmissionFiles: jest.fn(),
    getPrivatePhotoPath: jest.fn()
}));

const {
    createPlaceSubmission,
    getRewardPreview
} = require('../../models/placeSubmissionModel');
const {
    processSubmissionPhotos,
    deleteSubmissionFiles
} = require('../../services/placeSubmissionImageService');
const { create } = require('../../controllers/placeSubmissionController');

describe('placeSubmissionController.create', () => {
    const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
    const request = () => ({
        body: { name: 'Cascade cachee', category: 'nature', lat: '48.2', lng: '2.1' },
        files: [{ buffer: Buffer.from('photo') }],
        session: { user: { id: 7 } },
        get: jest.fn().mockReturnValue('submission-123456')
    });

    beforeEach(() => jest.clearAllMocks());

    test('exige une cle d idempotence', async () => {
        const req = request();
        req.get.mockReturnValue(null);
        const res = response();
        await create(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(processSubmissionPhotos).not.toHaveBeenCalled();
    });

    test('renvoie la proposition et l estimation des points', async () => {
        const req = request();
        const res = response();
        const photos = [{ url: 'a.webp', thumbnailUrl: 'a-thumb.webp', orderIndex: 0 }];
        processSubmissionPhotos.mockResolvedValue(photos);
        createPlaceSubmission.mockResolvedValue({
            created: true,
            submission: { id: 12, status: 'pending', adminComment: null, photos: [{ id: 4 }] }
        });
        getRewardPreview.mockResolvedValue({ approved: 0, approvalNumber: 1, points: 300 });

        await create(req, res);

        expect(createPlaceSubmission).toHaveBeenCalledWith(expect.objectContaining({
            userId: 7,
            clientRequestId: 'submission-123456',
            photos
        }));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            reward: expect.objectContaining({ points: 300 })
        }));
        expect(deleteSubmissionFiles).not.toHaveBeenCalled();
    });
});
