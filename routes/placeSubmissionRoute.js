const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const placeSubmissionRateLimit = require('../middleware/placeSubmissionRateLimit');
const { handlePlacePhotoUpload } = require('../middleware/uploadPlaceSubmissionPhotos');
const {
    create,
    mine,
    getOne,
    resubmit,
    cancel,
    rewardPreview,
    photo
} = require('../controllers/placeSubmissionController');

const router = express.Router();
router.use(requireAuth);

router.get('/reward-preview', rewardPreview);
router.get('/me', mine);
router.post('/', placeSubmissionRateLimit, handlePlacePhotoUpload, create);
router.get('/:id/photos/:photoId', photo);
router.get('/:id', getOne);
router.post('/:id/resubmit', placeSubmissionRateLimit, handlePlacePhotoUpload, resubmit);
router.delete('/:id', cancel);

module.exports = router;
