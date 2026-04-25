const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
    },
    { timestamps: true }
);

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [200, 'Product name cannot exceed 200 characters'],
        },
        description: {
            type: String,
            default: '',
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        comparePrice: {
            type: Number,
            default: null,
        },
        sku: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        barcode: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: [
                'قطعة',
                'دش',
                'ريسيفر',
                'ريموت',
                'صواميل',
                'سلك',
                'حامل شاشة',
                'حامل قطعة',
                'حجار',
                'عدسة',
                'وصلة 2×1',
                'وصلة 3×1',
                'وصلة 3×3',
                'أدبتور',
                'وصلة HD',
                'دايزك',
                'أخرى',
            ],
        },
        images: [
            {
                url: String,
                publicId: String,
            },
        ],
        stock: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        minStock: {
            type: Number,
            default: 5,
        },
        weight: {
            type: Number,
            default: 0,
        },
        dimensions: {
            length: { type: Number, default: 0 },
            width: { type: Number, default: 0 },
            height: { type: Number, default: 0 },
        },
        status: {
            type: String,
            enum: ['active', 'draft', 'archived'],
            default: 'active',
        },
        tags: [String],
        seoTitle: { type: String, default: '' },
        seoDescription: { type: String, default: '' },
        taxRate: { type: Number, default: 14 },
        shippingRequired: { type: Boolean, default: true },
        reviews: [reviewSchema],
        rating: {
            type: Number,
            default: 0,
        },
        numReviews: {
            type: Number,
            default: 0,
        },
        warehouse: { type: String, default: 'Cairo Main' },
        location: { type: String, default: '' },
        sold: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for inStock
productSchema.virtual('inStock').get(function () {
    return this.stock > 0;
});

// Virtual for stockStatus
productSchema.virtual('stockStatus').get(function () {
    if (this.stock === 0) return 'out_of_stock';
    if (this.stock <= this.minStock) return 'low_stock';
    return 'in_stock';
});

// Update average rating on review save
productSchema.methods.updateRating = function () {
    if (this.reviews.length === 0) {
        this.rating = 0;
        this.numReviews = 0;
    } else {
        const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
        this.rating = Math.round((total / this.reviews.length) * 10) / 10;
        this.numReviews = this.reviews.length;
    }
};

// Text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text', category: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);
