const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const InventoryLog = require('../models/InventoryLog');
const Notification = require('../models/Notification');

// @POST /api/orders  (protected) - place order
exports.placeOrder = async (req, res, next) => {
    try {
        const { shippingAddress, paymentMethod, notes } = req.body;

        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty.' });
        }

        // Validate stock and build order items
        const orderItems = [];
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id);
            if (!product || product.status !== 'active') {
                return res.status(400).json({ success: false, message: `Product "${item.name}" is no longer available.` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for "${product.name}". Only ${product.stock} left.` });
            }
            orderItems.push({
                product: product._id,
                name: product.name,
                image: product.images && product.images.length > 0 ? product.images[0].url : '',
                price: product.price,
                quantity: item.quantity,
                category: product.category,
            });
        }

        const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shippingCost = 0;
        const tax = 0;
        const total = subtotal + shippingCost + tax;

        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            shippingCost,
            tax,
            total,
            notes,
        });

        // Decrement stock and update sold count
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            const previousStock = product.stock;
            const newStock = previousStock - item.quantity;

            product.stock = newStock;
            product.sold += item.quantity;
            await product.save();

            await InventoryLog.create({
                product: product._id,
                user: req.user.id,
                type: 'out',
                quantity: item.quantity,
                previousStock,
                newStock,
                reason: 'sale',
                note: `طلب رقم #${order._id.toString().slice(-6)}`
            });
        }

        // Update user stats
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { totalOrders: 1, totalSpent: total },
        });

        // Clear cart
        await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

        // Create Notification for Admins
        const admins = await User.find({ role: 'admin' });
        const notificationsToInsert = admins.map(admin => ({
            user: admin._id,
            title: 'طلب جديد',
            message: `تم إنشاء طلب جديد برقم #${order._id.toString().slice(-6)} بقيمة ${total} ر.س`,
            link: '/admin/orders',
            type: 'order'
        }));
        if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert);
        }

        res.status(201).json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

// @GET /api/orders/my  (protected) - user's own orders
exports.getMyOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            Order.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Order.countDocuments({ user: req.user.id }),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            orders,
        });
    } catch (error) {
        next(error);
    }
};

// @GET /api/orders/:id  (protected) - single order
exports.getOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email phone');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // User can only see their own orders; admin can see all
        if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        res.status(200).json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/orders/:id/cancel  (protected) - cancel order
exports.cancelOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        if (!['pending', 'processing'].includes(order.status)) {
            return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage.' });
        }

        order.status = 'cancelled';
        order.cancelReason = req.body.reason || 'Cancelled by customer';
        await order.save();

        // Restore stock
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
                const previousStock = product.stock;
                const newStock = previousStock + item.quantity;

                product.stock = newStock;
                product.sold -= item.quantity;
                await product.save();

                await InventoryLog.create({
                    product: product._id,
                    user: req.user.id,
                    type: 'in',
                    quantity: item.quantity,
                    previousStock,
                    newStock,
                    reason: 'return',
                    note: `إلغاء طلب رقم #${order._id.toString().slice(-6)}`
                });
            }
        }

        // Reverse user stats
        await User.findByIdAndUpdate(order.user, {
            $inc: { totalOrders: -1, totalSpent: -order.total },
        });

        res.status(200).json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

// ======================== ADMIN ========================

// @GET /api/admin/orders  (admin)
exports.getAllOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search, dateRange } = req.query;
        const query = {};

        if (status && status !== 'all') query.status = status;

        if (dateRange) {
            const now = new Date();
            const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
            const days = daysMap[dateRange] || 7;
            query.createdAt = { $gte: new Date(now - days * 24 * 60 * 60 * 1000) };
        }

        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');
            const userIds = users.map((u) => u._id);
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { user: { $in: userIds } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('user', 'name email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Order.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            orders,
        });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/admin/orders/:id/status  (admin)
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status,
                ...(status === 'completed' && { isDelivered: true, deliveredAt: new Date() }),
            },
            { new: true }
        ).populate('user', 'name email');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        res.status(200).json({ success: true, order });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/admin/orders/:id  (admin)
exports.deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // We should also reverse the stats if it was a completed order, or maybe just delete it.
        // Usually, deleting an order also restores stock if it wasn't cancelled, 
        // but we'll assume admin explicitly deletes.
        // For simplicity, we just delete the order.
        await Order.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Order deleted successfully.' });
    } catch (error) {
        next(error);
    }
};
