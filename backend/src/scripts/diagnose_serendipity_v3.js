
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Check Serendipity Tasks
        const tasksCollection = mongoose.connection.collection('tasks');
        const tasks = await tasksCollection.find({ taskType: 'serendipity' }).toArray();

        console.log('\n--- SERENDIPITY TASKS ---');
        console.log(`Found ${tasks.length} tasks.`);
        tasks.forEach(t => {
            console.log(`[${t.status}] ${t.title} (ID: ${t._id})`);
            console.log(`   Cities: ${JSON.stringify(t.targetCities)}`);
        });

        // 2. Check User Encounters
        // Note: The collection name might be 'userencounters' or 'user_encounters'
        const collections = await mongoose.connection.db.listCollections().toArray();
        const encounterColName = collections.find(c => c.name.includes('encounter'))?.name;

        if (!encounterColName) {
            console.log('\n[!] Could not find an encounter collection.');
        } else {
            console.log(`\n--- ENCOUNTERS (Collection: ${encounterColName}) ---`);
            const encountersCtx = mongoose.connection.collection(encounterColName);
            const active = await encountersCtx.find({ status: 'active' }).toArray();
            console.log(`Active Encounters: ${active.length}`);
            active.forEach(e => {
                console.log(`   User: ${e.user}, Task: ${e.serendipityTask}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
