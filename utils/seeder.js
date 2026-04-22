require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
};

const seedData = async () => {
    await connectDB();

    // Clear existing
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed admin
    const admin = await User.create({
        name: 'Hossam Albasuony',
        email: process.env.ADMIN_EMAIL || 'admin@rushbasket.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role: 'admin',
        status: 'active',
        phone: '+20 123 456 7890',
        location: 'Cairo',
    });
    console.log(`✅ Admin created: ${admin.email}`);

    // Seed products
    const products = [
        {
            name: 'HD Receiver Pro',
            description: 'High-definition satellite receiver supporting all HD channels with USB recording.',
            price: 25.00,
            comparePrice: 30.00,
            sku: 'REC-HD-001',
            category: 'Receivers',
            brand: 'DreamTV',
            stock: 45,
            minStock: 10,
            rating: 4.5,
            numReviews: 12,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['receiver', 'HD', 'satellite'],
        },
        {
            name: '4K Ultra Receiver',
            description: 'Ultra HD 4K satellite receiver with Android OS and built-in Wi-Fi.',
            price: 12.00,
            comparePrice: 14.00,
            sku: 'REC-4K-002',
            category: 'Receivers',
            brand: 'Tiger',
            stock: 8,
            minStock: 15,
            rating: 4.8,
            numReviews: 28,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['receiver', '4K', 'android'],
        },
        {
            name: 'Twin LNB',
            description: 'Universal twin LNB for dual receiver setup. High gain, low noise figure.',
            price: 69.00,
            comparePrice: 83.00,
            sku: 'LNB-TWIN-001',
            category: 'LNB',
            brand: 'Starsat',
            stock: 32,
            minStock: 10,
            rating: 4.3,
            numReviews: 8,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['LNB', 'twin'],
        },
        {
            name: 'Satellite Dish 60cm',
            description: 'Offset satellite dish, 60cm diameter, galvanized steel construction.',
            price: 56.00,
            comparePrice: 67.00,
            sku: 'DISH-60-001',
            category: 'Satellite Dishes',
            brand: 'Other',
            stock: 120,
            minStock: 20,
            rating: 4.6,
            numReviews: 15,
            status: 'active',
            warehouse: 'Alexandria',
            tags: ['dish', '60cm', 'satellite'],
        },
        {
            name: 'Quad LNB',
            description: 'Quad-output LNB for up to 4 receivers from one dish.',
            price: 36.00,
            sku: 'LNB-QUAD-001',
            category: 'LNB',
            brand: 'Echolink',
            stock: 32,
            minStock: 8,
            rating: 4.4,
            numReviews: 6,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['LNB', 'quad'],
        },
        {
            name: 'RG6 Cable 10m',
            description: 'Premium RG6 coaxial cable, 75Ω, 10m length with F-connectors included.',
            price: 58.00,
            sku: 'CABLE-RG6-10',
            category: 'Cables',
            brand: 'Other',
            stock: 0,
            minStock: 25,
            rating: 4.2,
            numReviews: 4,
            status: 'active',
            warehouse: 'Giza',
            tags: ['cable', 'RG6', 'coaxial'],
        },
        {
            name: 'Satellite Finder',
            description: 'Digital satellite finder meter to quickly locate and align satellite dishes.',
            price: 47.00,
            sku: 'TOOL-FINDER-001',
            category: 'Accessories',
            brand: 'Other',
            stock: 18,
            minStock: 10,
            rating: 4.7,
            numReviews: 10,
            status: 'active',
            warehouse: 'Alexandria',
            tags: ['finder', 'tool', 'satellite'],
        },
        {
            name: 'Wall Mount Bracket',
            description: 'Heavy-duty adjustable wall mount bracket for satellite dishes up to 120cm.',
            price: 15.00,
            comparePrice: 20.00,
            sku: 'MOUNT-WALL-001',
            category: 'Mounts',
            brand: 'Other',
            stock: 60,
            minStock: 15,
            rating: 4.1,
            numReviews: 7,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['mount', 'bracket', 'wall'],
        },
        {
            name: '4x1 DiSEqC Switch',
            description: 'DiSEqC 1.0 switch supporting 4 satellite inputs into 1 receiver.',
            price: 22.00,
            comparePrice: 28.00,
            sku: 'SWITCH-4X1-001',
            category: 'Switches',
            brand: 'Other',
            stock: 6,
            minStock: 12,
            rating: 4.5,
            numReviews: 5,
            status: 'active',
            warehouse: 'Giza',
            tags: ['DiSEqC', 'switch'],
        },
        {
            name: 'Premium LNB Universal',
            description: 'Premium universal single LNB. 0.1dB noise figure for clearest signal.',
            price: 45.00,
            comparePrice: 55.00,
            sku: 'LNB-PREM-001',
            category: 'LNB',
            brand: 'DreamTV',
            stock: 0,
            minStock: 10,
            rating: 4.9,
            numReviews: 22,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['LNB', 'premium', 'universal'],
        },
        {
            name: 'Satellite Dish 120cm',
            description: 'Large 120cm offset satellite dish for weak signal areas.',
            price: 89.00,
            comparePrice: 110.00,
            sku: 'DISH-120-001',
            category: 'Satellite Dishes',
            brand: 'Other',
            stock: 25,
            minStock: 5,
            rating: 4.7,
            numReviews: 9,
            status: 'active',
            warehouse: 'Alexandria',
            tags: ['dish', '120cm', 'satellite'],
        },
        {
            name: 'HDMI Cable 2m',
            description: 'High-speed HDMI 2.0 cable, 2m, supports 4K/60Hz.',
            price: 8.00,
            comparePrice: 12.00,
            sku: 'CABLE-HDMI-2M',
            category: 'Cables',
            brand: 'Other',
            stock: 150,
            minStock: 30,
            rating: 4.3,
            numReviews: 18,
            status: 'active',
            warehouse: 'Cairo Main',
            tags: ['HDMI', 'cable', '4K'],
        },
    ];

    await Product.insertMany(products);
    console.log(`✅ Seeded ${products.length} products`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log(`Admin credentials:\n  Email: ${admin.email}\n  Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}\n`);

    process.exit(0);
};

seedData().catch((err) => {
    console.error('Seeder error:', err);
    process.exit(1);
});
