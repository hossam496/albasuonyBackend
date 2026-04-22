const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

// @GET /api/inventory/stats
exports.getInventoryStats = async (req, res, next) => {
    try {
        const totalProducts = await Product.countDocuments();
        const lowStockProducts = await Product.countDocuments({
            $expr: { $lte: ['$stock', '$minStock'] },
            stock: { $gt: 0 }
        });
        const outOfStockProducts = await Product.countDocuments({ stock: 0 });

        const totalStockValue = await Product.aggregate([
            { $group: { _id: null, total: { $sum: { $multiply: ['$stock', '$price'] } } } }
        ]);

        const categoryStats = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    stock: { $sum: '$stock' },
                    value: { $sum: { $multiply: ['$stock', '$price'] } }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            stats: {
                totalProducts,
                lowStock: lowStockProducts,
                outOfStock: outOfStockProducts,
                totalValue: totalStockValue[0]?.total || 0,
                categoryStats
            }
        });
    } catch (error) {
        next(error);
    }
};

// @GET /api/inventory/logs
exports.getInventoryLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, productId } = req.query;
        const query = productId ? { product: productId } : {};

        const skip = (Number(page) - 1) * Number(limit);

        const [logs, total] = await Promise.all([
            InventoryLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('product', 'name sku')
                .populate('user', 'name'),
            InventoryLog.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            logs
        });
    } catch (error) {
        next(error);
    }
};

// @POST /api/inventory/adjust
exports.adjustStock = async (req, res, next) => {
    try {
        const { productId, type, quantity, reason, note } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const previousStock = product.stock;
        let newStock = previousStock;

        if (type === 'in') {
            newStock += Number(quantity);
        } else if (type === 'out') {
            newStock -= Number(quantity);
        } else if (type === 'adjustment') {
            newStock = Number(quantity);
        }

        if (newStock < 0) {
            return res.status(400).json({ success: false, message: 'Stock cannot be negative.' });
        }

        product.stock = newStock;
        await product.save();

        await InventoryLog.create({
            product: productId,
            user: req.user.id,
            type,
            quantity: type === 'adjustment' ? newStock - previousStock : quantity,
            previousStock,
            newStock,
            reason,
            note
        });

        res.status(200).json({ success: true, product });
    } catch (error) {
        next(error);
    }
};
