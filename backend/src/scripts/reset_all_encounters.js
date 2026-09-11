
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const LOG_FILE = path.join(__dirname, 'reset_log.txt');

function log(msg) {
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { }
    console.log(msg);
}

async function run() {
    try {
        const paths = ['d:\\00_PROJECT\\city_explorer\\backend\\.env', path.join(__dirname, '../../.env')];
        for (const p of paths) { if (fs.existsSync(p)) { dotenv.config({ path: p }); break; } }
        if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://localhost:27017/city_explorer';
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected.');

        // Find collection name loosely
        const cols = await mongoose.connection.db.listCollections().toArray();
        const encColUrl = cols.find(c => c.name.includes('userencounter'));

        if (!encColUrl) {
            log('No UserEncounter collection found!');
            return;
        }

        const Encounter = mongoose.connection.collection(encColUrl.name);

        // Count active
        const count = await Encounter.countDocuments({ status: 'active' });
        log(`Found ${count} ACTIVE encounters.`);

        if (count > 0) {
            // Delete them or set to failed
            // Let's DELETE them to be cleanest for debug
            const result = await Encounter.deleteMany({ status: 'active' });
            log(`DELETED ${result.deletedCount} active encounters.`);
            log('User state is now CLEAN.');
        } else {
            log('No active encounters to clear.');
        }

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

run();
