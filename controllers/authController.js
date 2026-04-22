const User = require('../models/User');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const jwt = require('jsonwebtoken');

// Helper: send tokens as cookie + response
const sendTokenResponse = async (user, statusCode, res) => {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token in database (for rotation/revocation)
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);

    // Keep only last 5 tokens (limit devices)
    if (user.refreshTokens.length > 5) {
        user.refreshTokens.shift();
    }
    await user.save();

    const cookieOptions = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_REFRESH_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };

    const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        avatar: user.avatar,
        status: user.status,
    };

    res
        .status(statusCode)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .json({
            success: true,
            accessToken, // Return access token to frontend memory
            user: userData
        });
};

// @POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const user = await User.create({ name, email, password });
        await sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
        }

        await sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/refresh-token
exports.refreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'No refresh token provided.' });
        }

        // Verify token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret_keys_123456789');

        // Find user and check if token exists in their list
        const user = await User.findById(decoded.id);
        if (!user || !user.refreshTokens.includes(refreshToken)) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
        }

        // Generate new access token
        const accessToken = user.generateAccessToken();

        res.status(200).json({
            success: true,
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                status: user.status,
            }
        });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token refresh failed.' });
    }
};

// @POST /api/auth/logout
exports.logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    // Remove refresh token from DB if it exists
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret_keys_123456789');
            await User.findByIdAndUpdate(decoded.id, {
                $pull: { refreshTokens: refreshToken }
            });
        } catch (error) {
            // silent
        }
    }

    res.cookie('refreshToken', '', {
        expires: new Date(0),
        httpOnly: true,
    });
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// @GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/auth/me
exports.updateMe = async (req, res, next) => {
    try {
        const { name, phone, location } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone, location },
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        if (!(await user.comparePassword(currentPassword))) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

// Validators
exports.registerValidators = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
];

exports.loginValidators = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
];
