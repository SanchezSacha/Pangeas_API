const { awardApprovedPlaceSubmissionPoints } = require('../../models/pointModel');

describe('points des propositions publiees', () => {
    const transaction = ({ previous = null, count = 0 } = {}) => ({
        pointTransaction: {
            findFirst: jest.fn().mockResolvedValue(previous),
            count: jest.fn().mockResolvedValue(count),
            create: jest.fn().mockResolvedValue({})
        },
        pointAccount: { upsert: jest.fn().mockResolvedValue({}) }
    });

    test('credite 300 points pour la premiere proposition publiee', async () => {
        const tx = transaction({ count: 0 });
        const award = await awardApprovedPlaceSubmissionPoints(tx, 8, 42);

        expect(award).toEqual(expect.objectContaining({
            awarded: true,
            approvalNumber: 1,
            points: 300
        }));
        expect(tx.pointAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ availablePoints: 300 })
        }));
    });

    test('ne credite jamais deux fois la meme proposition', async () => {
        const tx = transaction({ previous: { id: 1 } });
        await expect(awardApprovedPlaceSubmissionPoints(tx, 8, 42)).resolves.toEqual({
            awarded: false,
            points: 0
        });
        expect(tx.pointAccount.upsert).not.toHaveBeenCalled();
    });
});
