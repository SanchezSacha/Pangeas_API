const express = require('express');
const { isAdmin } = require('../../middleware/admin/isAdmin');
const controller = require('../../controllers/admin/rewardAdminController');
const donationController = require('../../controllers/admin/donationAdminController');

const router = express.Router();

router.use(isAdmin);
router.get('/partners', controller.getPartners);
router.post('/partners', controller.postPartner);
router.patch('/partners/:id', controller.patchPartner);
router.delete('/partners/:id', controller.deletePartner);
router.get('/rewards', controller.getRewards);
router.get('/rewards/:id', controller.getReward);
router.post('/rewards', controller.postReward);
router.patch('/rewards/:id', controller.patchReward);
router.delete('/rewards/:id', controller.deleteReward);
router.post('/rewards/:id/codes', controller.postCouponCodes);
router.patch('/coupon-codes/:id/status', controller.patchCouponStatus);
router.get('/donation-campaigns', donationController.getCampaigns);
router.post('/donation-campaigns', donationController.postCampaign);
router.patch('/donation-campaigns/:id', donationController.patchCampaign);
router.delete('/donation-campaigns/:id', donationController.deleteCampaign);
router.get('/donations', donationController.getDonations);
router.patch('/donations/:id/status', donationController.patchDonationStatus);

module.exports = router;
