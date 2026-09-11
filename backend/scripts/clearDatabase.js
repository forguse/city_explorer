const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city_explorer';

const clearDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const collections = await mongoose.connection.db.collections();

        if (collections.length === 0) {
            console.log('Database is already empty.');
            return;
        }

        console.log(`Found ${collections.length} collections. Clearing data...`);

        for (let collection of collections) {
            // Skip system collections if any
            if (collection.collectionName.startsWith('system.')) continue;

            try {
                await collection.drop();
                console.log(`🗑️ Dropped collection: ${collection.collectionName}`);
            } catch (err) {
                // Ignore error if collection doesn't exist (race condition)
                if (err.message !== 'ns not found') {
                    console.error(`Error dropping ${collection.collectionName}:`, err.message);
                }
            }
        }

        console.log('\n✅ All data cleared successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

const main = async () => {
    console.log('Starting clear database...');
    await clearDatabase();
    process.exit(0);
};

main();
