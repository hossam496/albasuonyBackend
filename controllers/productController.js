const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');

// @GET /api/products  (public)
exports.getProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            brand,
            search,
            sortBy = 'default',
            minPrice,
            maxPrice,
            status = 'active',
        } = req.query;

        const query = {};

        // Admin can see all statuses; public only sees active
        if (req.user && req.user.role === 'admin') {
            if (req.query.status) query.status = req.query.status;
        } else {
            query.status = 'active';
        }

        if (category && !['All', 'الكل'].includes(category)) query.category = category;
        if (brand && !['All', 'الكل'].includes(brand)) query.brand = brand;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (search) {
            query.$text = { $search: search };
        }

        const sortOptions = {
            default: { createdAt: -1 },
            'price-low': { price: 1 },
            'price-high': { price: -1 },
            rating: { rating: -1 },
            newest: { createdAt: -1 },
        };
        const sort = sortOptions[sortBy] || sortOptions.default;

        const skip = (Number(page) - 1) * Number(limit);

        const [products, total] = await Promise.all([
            Product.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
            Product.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            products,
        });
    } catch (error) {
        next(error);
    }
};

// @GET /api/products/:id  (public)
exports.getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate('reviews.user', 'name avatar');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        next(error);
    }
};

// @POST /api/products  (admin)
exports.createProduct = async (req, res, next) => {
    try {
        const productData = { ...req.body };

        // Handle uploaded images
        if (req.files && req.files.length > 0) {
            productData.images = req.files.map((file) => ({
                url: file.path,
                publicId: file.filename,
            }));
        }

        // Parse dimensions/tags if sent as JSON string
        if (typeof productData.dimensions === 'string') {
            productData.dimensions = JSON.parse(productData.dimensions);
        }
        if (typeof productData.tags === 'string') {
            productData.tags = JSON.parse(productData.tags);
        }

        const product = await Product.create(productData);

        res.status(201).json({ success: true, product });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/products/:id  (admin)
exports.updateProduct = async (req, res, next) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const updateData = { ...req.body };

        // If new images uploaded, append them
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((file) => ({
                url: file.path,
                publicId: file.filename,
            }));
            updateData.images = [...(product.images || []), ...newImages];
        }

        if (typeof updateData.dimensions === 'string') {
            updateData.dimensions = JSON.parse(updateData.dimensions);
        }
        if (typeof updateData.tags === 'string') {
            updateData.tags = JSON.parse(updateData.tags);
        }

        product = await Product.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, product });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/products/:id  (admin)
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // Delete images from Cloudinary
        for (const img of product.images) {
            if (img.publicId) {
                await cloudinary.uploader.destroy(img.publicId).catch(() => { });
            }
        }

        await product.deleteOne();
        res.status(200).json({ success: true, message: 'Product deleted.' });
    } catch (error) {
        next(error);
    }
};

// @POST /api/products/:id/reviews  (protected)
exports.addReview = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        // Check if already reviewed
        const alreadyReviewed = product.reviews.find(
            (r) => r.user.toString() === req.user.id.toString()
        );

        if (alreadyReviewed) {
            return res.status(400).json({ success: false, message: 'You already reviewed this product.' });
        }

        product.reviews.push({
            user: req.user.id,
            name: req.user.name,
            rating: Number(rating),
            comment,
        });

        product.updateRating();
        await product.save();

        res.status(201).json({ success: true, message: 'Review added.' });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/products/:id/images/:publicId  (admin)
exports.deleteProductImage = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const { publicId } = req.params;
        await cloudinary.uploader.destroy(publicId).catch(() => { });
        product.images = product.images.filter((img) => img.publicId !== publicId);
        await product.save();

        res.status(200).json({ success: true, message: 'Image deleted.' });
    } catch (error) {
        next(error);
    }
};

// @GET /api/products/categories  (public)
exports.getCategories = async (req, res, next) => {
    try {
        const categories = await Product.distinct('category', { status: 'active' });
        res.status(200).json({ success: true, categories });
    } catch (error) {
        next(error);
    }
};
