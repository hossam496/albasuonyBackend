const express = require('express');
const router = express.Router();
const {
    getInventoryStats,
    getInventoryLogs,
    adjustStock
} = require('../controllers/inventoryController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.use(adminOnly);

router.get('/stats', getInventoryStats);
router.get('/logs', getInventoryLogs);
router.post('/adjust', adjustStock);

module.exports = router;
