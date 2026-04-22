const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
    getAllUsers,
    getUser,
    updateUser,
    deleteUser,
    bulkUpdateUsers,
    getDashboardStats,
    getInventory,
    updateInventory,
} = require('../controllers/adminController');
const {
    getAllOrders,
    updateOrderStatus,
    deleteOrder,
} = require('../controllers/orderController');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.put('/users/bulk', bulkUpdateUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Orders
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

// Inventory
router.get('/inventory', getInventory);
router.put('/inventory/:id', updateInventory);

module.exports = router;
