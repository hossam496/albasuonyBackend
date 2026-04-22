const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        role: {
            type: String,
            enum: ['customer', 'admin'],
            default: 'customer',
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'pending'],
            default: 'active',
        },
        avatar: {
            type: String,
            default: '',
        },
        location: {
            type: String,
            default: '',
        },
        addresses: [
            {
                label: { type: String, default: 'Home' },
                street: String,
                city: String,
                state: String,
                country: { type: String, default: 'Egypt' },
                isDefault: { type: Boolean, default: false },
            },
        ],
        wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        totalOrders: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        resetPasswordToken: String,
        resetPasswordExpire: Date,
        refreshTokens: [String], // Array of valid refresh tokens for multiple devices
    },
    { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate Access Token (Short-lived)
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
    );
};

// Generate Refresh Token (Long-lived)
userSchema.methods.generateRefreshToken = function () {
    const refreshToken = jwt.sign(
        { id: this._id },
        process.env.JWT_REFRESH_SECRET || 'refresh_secret_keys_123456789',
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    return refreshToken;
};

module.exports = mongoose.model('User', userSchema);
