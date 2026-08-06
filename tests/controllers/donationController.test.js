jest.mock('../../models/donationModel', () => {
    class DonationError extends Error {
        constructor(code, message, status = 400) {
            super(message);
            this.code = code;
            this.status = status;
        }
    }
    return {
        DonationError,
        listDonationCampaigns: jest.fn(),
        redeemDonation: jest.fn(),
        getUserDonations: jest.fn()
    };
});

const { DonationError, redeemDonation } = require('../../models/donationModel');
const { redeem } = require('../../controllers/donationController');

describe('donationController.redeem', () => {
    const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
    const request = () => ({
        params: { id: '4' },
        body: { amount: 5 },
        session: { user: { id: 7 } },
        get: jest.fn().mockReturnValue('donation-123456')
    });

    beforeEach(() => jest.clearAllMocks());

    it('declenche un don finance par le partenaire', async () => {
        const req = request();
        const res = response();
        redeemDonation.mockResolvedValue({ id: 9, amount: '5.00', status: 'pending' });

        await redeem(req, res);

        expect(redeemDonation).toHaveBeenCalledWith({
            userId: 7,
            campaignId: 4,
            amount: 5,
            clientRequestId: 'donation-123456'
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'Le don finance par le partenaire a ete declenche.'
        }));
    });

    it('retourne une erreur metier lorsque le budget est epuise', async () => {
        const req = request();
        const res = response();
        redeemDonation.mockRejectedValue(new DonationError('BUDGET_EXHAUSTED', 'Budget epuise.', 409));

        await redeem(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            code: 'BUDGET_EXHAUSTED',
            message: 'Budget epuise.'
        });
    });

    it('refuse une requete sans cle d idempotence', async () => {
        const req = request();
        req.get.mockReturnValue(null);
        const res = response();

        await redeem(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(redeemDonation).not.toHaveBeenCalled();
    });
});
