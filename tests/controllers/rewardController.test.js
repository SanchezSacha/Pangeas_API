jest.mock('../../models/rewardModel', () => {
    class RewardError extends Error {
        constructor(code, message, status) {
            super(message);
            this.code = code;
            this.status = status;
        }
    }
    return {
        RewardError,
        listRewards: jest.fn(),
        getRewardById: jest.fn(),
        redeemReward: jest.fn(),
        getUserRedemptions: jest.fn()
    };
});

const { redeemReward, RewardError } = require('../../models/rewardModel');
const { redeem } = require('../../controllers/rewardController');

describe('rewardController.redeem', () => {
    const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

    beforeEach(() => jest.clearAllMocks());

    it('refuse un echange sans cle d idempotence', async () => {
        const req = {
            params: { id: '3' },
            session: { user: { id: 7 } },
            get: jest.fn().mockReturnValue(null)
        };
        const res = response();

        await redeem(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(redeemReward).not.toHaveBeenCalled();
    });

    it('transmet une demande valide au modele', async () => {
        const req = {
            params: { id: '3' },
            session: { user: { id: 7 } },
            get: jest.fn().mockReturnValue('redeem-12345678')
        };
        const res = response();
        redeemReward.mockResolvedValue({ id: 11, status: 'completed' });

        await redeem(req, res);

        expect(redeemReward).toHaveBeenCalledWith({
            userId: 7,
            rewardId: 3,
            clientRequestId: 'redeem-12345678'
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('renvoie le statut metier du modele', async () => {
        const req = {
            params: { id: '3' },
            session: { user: { id: 7 } },
            get: jest.fn().mockReturnValue('redeem-12345678')
        };
        const res = response();
        redeemReward.mockRejectedValue(new RewardError('OUT_OF_STOCK', 'Stock epuise.', 409));

        await redeem(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: 'OUT_OF_STOCK',
            message: 'Stock epuise.'
        });
    });
});
