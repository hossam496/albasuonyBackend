const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @GET /api/admin/users  (admin)
exports.getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, status, role } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;
        if (role && role !== 'all') query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [users, total] = await Promise.all([
            User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            users,
        });
    } catch (error) {
        next(error);
    }
};

// @GET /api/admin/users/:id  (admin)
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/admin/users/:id  (admin)
exports.updateUser = async (req, res, next) => {
    try {
        const { name, email, role, status, phone, location } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role, status, phone, location },
            { new: true, runValidators: true }
        );
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/admin/users/:id  (admin)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, message: 'User deleted.' });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/admin/users/bulk  (admin) - bulk status update
exports.bulkUpdateUsers = async (req, res, next) => {
    try {
        const { userIds, status } = req.body;
        await User.updateMany({ _id: { $in: userIds } }, { status });
        res.status(200).json({ success: true, message: `${userIds.length} users updated.` });
    } catch (error) {
        next(error);
    }
};

// @GET /api/admin/dashboard  (admin)
exports.getDashboardStats = async (req, res, next) => {
    try {
        const { range = '7d' } = req.query;
        const daysMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[range] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

        // Parallel queries for performance
        const [
            totalRevenue,
            prevRevenue,
            totalOrders,
            prevOrders,
            totalUsers,
            prevUsers,
            totalProducts,
            recentOrders,
            revenueByDay,
            categoryStats,
            lowStockProducts,
        ] = await Promise.all([
            // Current period revenue (completed/shipped)
            Order.aggregate([
                { $match: { createdAt: { $gte: since }, status: { $in: ['completed', 'shipped', 'processing'] } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            // Previous period revenue
            Order.aggregate([
                { $match: { createdAt: { $gte: prevSince, $lt: since }, status: { $in: ['completed', 'shipped', 'processing'] } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            // Current orders
            Order.countDocuments({ createdAt: { $gte: since } }),
            // Prev orders
            Order.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
            // Users
            User.countDocuments({ createdAt: { $gte: since } }),
            User.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
            // Products
            Product.countDocuments({ status: 'active' }),
            // Recent orders
            Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(5),
            // Revenue by day (for chart)
            Order.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$total' },
                        orders: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            // Category sales
            Order.aggregate([
                { $match: { createdAt: { $gte: since }, status: { $in: ['completed', 'shipped'] } } },
                { $unwind: '$items' },
                { $group: { _id: '$items.category', value: { $sum: '$items.quantity' } } },
                { $sort: { value: -1 } },
                { $limit: 10 },
            ]),
            // Low stock
            Product.find({
                status: 'active',
                $or: [
                    { $expr: { $lte: ['$stock', '$minStock'] } },
                    { stock: { $lte: 5 }, minStock: { $exists: false } }
                ]
            })
                .sort({ stock: 1 })
                .limit(5)
                .select('name stock minStock category'),
        ]);

        const currRevenue = totalRevenue[0]?.total || 0;
        const prevRev = prevRevenue[0]?.total || 0;
        const revenueChange = prevRev === 0 ? 100 : ((currRevenue - prevRev) / prevRev) * 100;
        const ordersChange = prevOrders === 0 ? 100 : ((totalOrders - prevOrders) / prevOrders) * 100;

        // Pending orders count
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const completedOrders = await Order.countDocuments({ status: 'completed' });

        res.status(200).json({
            success: true,
            stats: {
                totalRevenue: currRevenue,
                revenueChange: Math.round(revenueChange * 10) / 10,
                totalOrders,
                ordersChange: Math.round(ordersChange * 10) / 10,
                totalUsers,
                totalProducts,
                pendingOrders,
                completedOrders,
            },
            revenueByDay,
            categoryStats: categoryStats.map((c) => ({ name: c._id || 'Other', value: c.value })),
            recentOrders,
            lowStockProducts,
        });
    } catch (error) {
        next(error);
    }
};

// @GET /api/admin/inventory  (admin)
exports.getInventory = async (req, res, next) => {
    try {
        const { search, status, warehouse } = req.query;
        const query = { status: { $ne: 'archived' } };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
            ];
        }
        if (warehouse && warehouse !== 'all') query.warehouse = { $regex: warehouse, $options: 'i' };

        const products = await Product.find(query)
            .select('name sku stock minStock warehouse location status category')
            .sort({ stock: 1 });

        // Filter by stock status post-query
        const filtered = status && status !== 'all'
            ? products.filter((p) => p.stockStatus === status)
            : products;

        // Stats
        const inStock = products.filter((p) => p.stock > p.minStock).length;
        const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
        const outOfStock = products.filter((p) => p.stock === 0).length;

        res.status(200).json({
            success: true,
            products: filtered,
            stats: {
                total: products.length,
                inStock,
                lowStock,
                outOfStock,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/admin/inventory/:id  (admin) - update stock
exports.updateInventory = async (req, res, next) => {
    try {
        const { stock, minStock, warehouse, location } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { stock, minStock, warehouse, location },
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        next(error);
    }
};
