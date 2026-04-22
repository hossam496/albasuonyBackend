const express = require('express');
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    addReview,
    deleteProductImage,
    getCategories,
} = require('../controllers/productController');

// Public
router.get('/categories', getCategories);
router.get('/', optionalAuth, getProducts);
router.get('/:id', getProduct);

// Protected
router.post('/:id/reviews', protect, addReview);

// Admin
router.post('/', protect, adminOnly, upload.array('images', 10), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 10), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
router.delete('/:id/images/:publicId', protect, adminOnly, deleteProductImage);

module.exports = router;
