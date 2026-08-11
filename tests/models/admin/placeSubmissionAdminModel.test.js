const mockMongoCollection = {
    updateOne: jest.fn(),
    findOne: jest.fn()
};
const mockTransaction = {
    placeSubmission: {
        findUnique: jest.fn(),
        updateMany: jest.fn()
    },
    placeSubmissionModeration: { create: jest.fn() },
    internalNotification: { create: jest.fn() }
};

jest.mock('../../../BDD/prisma', () => ({
    placeSubmission: { findUnique: jest.fn() },
    pointTransaction: { findMany: jest.fn() },
    $transaction: jest.fn(callback => callback(mockTransaction))
}));
jest.mock('../../../BDD/mongo', () => ({
    getPlacesCollection: jest.fn(() => mockMongoCollection)
}));
jest.mock('../../../models/pointModel', () => ({
    awardApprovedPlaceSubmissionPoints: jest.fn()
}));
jest.mock('../../../services/placeSubmissionImageService', () => ({
    promoteSubmissionPhotos: jest.fn()
}));

const prisma = require('../../../BDD/prisma');
const { awardApprovedPlaceSubmissionPoints } = require('../../../models/pointModel');
const { promoteSubmissionPhotos } = require('../../../services/placeSubmissionImageService');
const {
    moderatePlaceSubmission,
    publishPlaceSubmission
} = require('../../../models/admin/placeSubmissionAdminModel');

describe('moderation des propositions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction.placeSubmission.updateMany.mockResolvedValue({ count: 1 });
        mockTransaction.placeSubmissionModeration.create.mockResolvedValue({});
        mockTransaction.internalNotification.create.mockResolvedValue({});
    });

    test('demande un complement et notifie le proprietaire', async () => {
        mockTransaction.placeSubmission.findUnique
            .mockResolvedValueOnce({ id: 4, userId: 9, status: 'pending' })
            .mockResolvedValueOnce({ id: 4, userId: 9, status: 'needs_changes', photos: [] });

        await moderatePlaceSubmission({
            submissionId: 4,
            adminId: 2,
            action: 'request_changes',
            comment: 'Ajoutez une photo plus nette.'
        });

        expect(mockTransaction.placeSubmission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'needs_changes' })
        }));
        expect(mockTransaction.internalNotification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: 9, type: 'submission_needs_changes' })
        });
    });

    test('publie dans Mongo puis credite les points dans la transaction Prisma', async () => {
        const submission = {
            id: 4,
            userId: 9,
            title: 'Cascade',
            category: 'nature',
            description: 'Description',
            coordinates: { lat: 48, lng: 2 },
            status: 'pending',
            photos: [{ id: 1, submissionId: 4, url: 'a.webp' }]
        };
        prisma.placeSubmission.findUnique.mockResolvedValue(submission);
        mockTransaction.placeSubmission.findUnique
            .mockResolvedValueOnce(submission)
            .mockResolvedValueOnce({ ...submission, status: 'approved', mongoPlaceId: 'mongo42' });
        promoteSubmissionPhotos.mockResolvedValue(['/uploads/places/a.webp']);
        mockMongoCollection.updateOne.mockResolvedValue({});
        mockMongoCollection.findOne.mockResolvedValue({ _id: { toString: () => 'mongo42' } });
        awardApprovedPlaceSubmissionPoints.mockResolvedValue({
            awarded: true,
            points: 300,
            approvalNumber: 1
        });

        const result = await publishPlaceSubmission({
            submissionId: 4,
            adminId: 2,
            comment: '',
            placeData: {
                name: '',
                department: '75',
                region: 'Ile-de-France',
                category: '',
                description: '',
                legend: 'Legende',
                anecdote: 'Anecdote',
                activities: ['Marche'],
                image_url: null,
                coordinates: null,
                distance_km: 2
            }
        });

        expect(awardApprovedPlaceSubmissionPoints).toHaveBeenCalledWith(mockTransaction, 9, 4);
        expect(mockTransaction.placeSubmission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'approved', mongoPlaceId: 'mongo42' })
        }));
        expect(mockMongoCollection.updateOne).toHaveBeenLastCalledWith(
            { submission_id: 4 },
            { $set: expect.objectContaining({ is_published: true }) }
        );
        expect(result).toEqual(expect.objectContaining({ points: 300, approvalNumber: 1 }));
    });
});
