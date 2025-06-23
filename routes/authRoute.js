const express = require('express');
const router = express.Router();
const validateUser = require('../middleware/validateUser');
const handleMulterError = require('../middleware/validateMulter');
const uploadAvatar = require('../middleware/uploadAvatar');
const { registerUser } = require('../controllers/authController');

router.post('/', (req, res, next) =>
        uploadAvatar.single('avatar')(req, res, (err) => {
            if (err) return handleMulterError(err, req, res, next);
            next();
        }), validateUser, registerUser);
module.exports = router;
