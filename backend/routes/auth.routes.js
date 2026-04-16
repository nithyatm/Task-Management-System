const express = require('express');
const router = express.Router();
const { register, login, getProfile, changePassword } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
