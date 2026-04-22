const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Helper: sync cart item data from product
const syncCartItem = (cartItem, product) => ({
    product: product._id,
    name: product.name,
    image: product.images && product.images.length > 0 ? product.images[0].url : '',
    price: product.price,
    category: product.category,
    quantity: cartItem.quantity,
});

// @GET /api/cart  (protected)
exports.getCart = async (req, res, next) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name images price stock status category');

        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [] });
        }

        res.status(200).json({ success: true, cart });
    } catch (error) {
        next(error);
    }
};

// @POST /api/cart  (protected) - add item
exports.addToCart = async (req, res, next) => {
    try {
        const { productId, quantity = 1 } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        if (product.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Product is not available.' });
        }
        if (product.stock < 1) {
            return res.status(400).json({ success: false, message: 'Product is out of stock.' });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }

        const existingIndex = cart.items.findIndex(
            (item) => item.product.toString() === productId
        );

        if (existingIndex >= 0) {
            const newQty = cart.items[existingIndex].quantity + Number(quantity);
            if (newQty > product.stock) {
                return res.status(400).json({ success: false, message: `Only ${product.stock} units available.` });
            }
            cart.items[existingIndex].quantity = newQty;
        } else {
            cart.items.push({
                product: product._id,
                name: product.name,
                image: product.images && product.images.length > 0 ? product.images[0].url : '',
                price: product.price,
                category: product.category,
                quantity: Number(quantity),
            });
        }

        await cart.save();
        res.status(200).json({ success: true, cart });
    } catch (error) {
        next(error);
    }
};

// @PUT /api/cart/:itemId  (protected) - update qty
exports.updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        const itemIndex = cart.items.findIndex((i) => i._id.toString() === req.params.itemId);
        if (itemIndex < 0) {
            return res.status(404).json({ success: false, message: 'Item not found in cart.' });
        }

        if (Number(quantity) < 1) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = Number(quantity);
        }

        await cart.save();
        res.status(200).json({ success: true, cart });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/cart/:itemId  (protected) - remove item
exports.removeFromCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        cart.items = cart.items.filter((i) => i._id.toString() !== req.params.itemId);
        await cart.save();

        res.status(200).json({ success: true, cart });
    } catch (error) {
        next(error);
    }
};

// @DELETE /api/cart  (protected) - clear cart
exports.clearCart = async (req, res, next) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }
        res.status(200).json({ success: true, message: 'Cart cleared.' });
    } catch (error) {
        next(error);
    }
};
