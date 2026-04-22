const Brand = require('../models/Brand');
const Product = require('../models/Product');

// @GET /api/brands
exports.getBrands = async (req, res, next) => {
    try {
        console.log('Fetching brands from DB...');
        const brands = await Brand.find({}).sort({ name: 1 });
        console.log(`Found ${brands.length} active brands.`);
        res.status(200).json({ success: true, brands });
    } catch (error) {
        console.error('Brand fetch error:', error);
        next(error);
    }
};

// @GET /api/admin/brands (admin)
exports.getAllBrands = async (req, res, next) => {
    try {
        const brands = await Brand.find().sort({ name: 1 });
        res.status(200).json({ success: true, brands });
    } catch (error) {
        next(error);
    }
};

// @POST /api/admin/brands (admin)
exports.createBrand = async (req, res, next) => {
    try {
        const brand = await Brand.create(req.body);
        res.status(201).json({ success: true, brand });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/admin/brands/:id (admin)
exports.updateBrand = async (req, res, next) => {
    try {
        const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }
        res.status(200).json({ success: true, brand });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/admin/brands/:id (admin)
exports.deleteBrand = async (req, res, next) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ success: false, message: 'Brand not found' });
        }

        // Check if brand is being used by any products
        const productCount = await Product.countDocuments({ brand: brand.name });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete brand as it is associated with ${productCount} products.`,
            });
        }

        await brand.deleteOne();
        res.status(200).json({ success: true, message: 'Brand deleted' });
    } catch (error) {
        next(error);
    }
};

// @GET /api/brands/stats - Get sales stats by brand
exports.getBrandStats = async (req, res, next) => {
    try {
        // This would be part of admin dashboard generally
        const stats = await Product.aggregate([
            { $group: { _id: '$brand', productsCount: { $sum: 1 }, totalSold: { $sum: '$sold' } } },
            { $sort: { totalSold: -1 } }
        ]);
        res.status(200).json({ success: true, stats });
    } catch (error) {
        next(error);
    }
};
