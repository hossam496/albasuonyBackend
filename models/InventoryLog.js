const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['in', 'out', 'adjustment'],
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        previousStock: {
            type: Number,
            required: true,
        },
        newStock: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            default: '',
        },
        note: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
