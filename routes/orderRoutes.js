const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    placeOrder,
    getMyOrders,
    getOrder,
    cancelOrder,
} = require('../controllers/orderController');

router.use(protect);

router.post('/', placeOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
