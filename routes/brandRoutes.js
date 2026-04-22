const express = require('express');
const router = express.Router();
const { getBrands, getAllBrands, createBrand, updateBrand, deleteBrand, getBrandStats } = require('../controllers/brandController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/', getBrands);

// Admin routes
router.get('/all', protect, adminOnly, getAllBrands);
router.post('/', protect, adminOnly, createBrand);
router.put('/:id', protect, adminOnly, updateBrand);
router.delete('/:id', protect, adminOnly, deleteBrand);
router.get('/stats', protect, adminOnly, getBrandStats);

module.exports = router;
