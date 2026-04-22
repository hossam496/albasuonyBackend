const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    register,
    login,
    logout,
    getMe,
    updateMe,
    changePassword,
    refreshToken,
    registerValidators,
    loginValidators,
} = require('../controllers/authController');

router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
