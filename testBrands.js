require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('./models/Brand');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const brands = await Brand.find({});
        console.log('Total Brands found:', brands.length);
        brands.forEach(b => console.log(`- ${b.name} (Active: ${b.isActive})`));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
