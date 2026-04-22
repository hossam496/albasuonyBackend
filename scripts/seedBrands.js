require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('../models/Brand');

const brands = [
    { name: 'Nova', description: 'Nova brand products' },
    { name: 'RED LINE', description: 'RED LINE brand products' },
    { name: 'GALAXY', description: 'GALAXY brand products' },
    { name: 'Star Sat', description: 'Star Sat brand products' },
    { name: 'Tiger', description: 'Tiger brand products' },
    { name: 'Truman', description: 'Truman brand products' },
    { name: 'SKY', description: 'SKY brand products' },
    { name: 'Media Star', description: 'Media Star brand products' },
    { name: 'ASTRA', description: 'ASTRA brand products' },
    { name: 'Other', description: 'Other brands' },
];

const seedBrands = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for brand seeding...');

        // Clear existing brands if any
        await Brand.deleteMany({});
        console.log('Cleared existing brands.');

        // Insert new brands
        await Brand.insertMany(brands);
        console.log('Successfully seeded new brands!');

        process.exit();
    } catch (error) {
        console.error('Error seeding brands:', error);
        process.exit(1);
    }
};

seedBrands();
