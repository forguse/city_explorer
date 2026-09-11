
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const LOG_FILE = path.join(__dirname, 'debug_output.txt');

function log(msg) {
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { }
    console.log(msg);
}

async function run() {
    try {
        fs.writeFileSync(LOG_FILE, 'Creating debug log v5...\n');

        // Try multiple paths
        const paths = [
            path.join(__dirname, '../../.env'), // backend/.env
            path.join(__dirname, '../../../.env'), // project root/.env
            'd:\\00_PROJECT\\city_explorer\\backend\\.env',
            'd:\\00_PROJECT\\city_explorer\\.env'
        ];

        let loaded = false;
        for (const p of paths) {
            if (fs.existsSync(p)) {
                log(`Found .env at: ${p}`);
                dotenv.config({ path: p });
                if (process.env.MONGO_URI) {
                    log('Loaded MONGO_URI from .env');
                    loaded = true;
                    break;
                }
            }
        }

        if (!process.env.MONGO_URI) {
            // Hard fallback if typical for local dev
            log('[!] MONGO_URI not found in env files. Trying default localhost...');
            process.env.MONGO_URI = 'mongodb://localhost:27017/city_explorer';
        }

        log(`Connecting to: ${process.env.MONGO_URI}`);
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected.');

        // 1. Check Specific Serendipity Task from screenshot
        const tasksCollection = mongoose.connection.collection('tasks');
        // task id: 000000000000000000000000
        // Wait, screenshot shows 000000000000000000000000 ?
        // No, I need to look closely at the screenshot User provided in the prompt.
        // It says _id: ObjectId("6572dd...") 
        // Actually, let's just find ANY matching task.

        const task = await tasksCollection.findOne({ taskType: 'serendipity' });

        if (task) {
            log(`\nFound Sample Serendipity Task: ${task.title}`);
            log(`_id: ${task._id}`);
            log(`Status: ${task.status}`);
            log(`TargetCities: ${JSON.stringify(task.targetCities)}`);
        } else {
            log('\n[!] NO serendipity tasks found at all.');
        }

        // 2. Check Encounters
        const cols = await mongoose.connection.db.listCollections().toArray();
        const encCol = cols.find(c => c.name.includes('encounter'));

        if (encCol) {
            log(`\nChecking collection: ${encCol.name}`);
            const encCollection = mongoose.connection.collection(encCol.name);
            const count = await encCollection.countDocuments({});
            log(`Total documents in ${encCol.name}: ${count}`);

            const active = await encCollection.find({ status: 'active' }).toArray();
            log(`Active encounters: ${active.length}`);
            active.forEach(e => log(` - User: ${e.user}, Task: ${e.serendipityTask}`));

            // Check for completed encounters for this user if possible
            // We don't have user ID easily here unless we pass it or just list all
        } else {
            log('[!] No encounter collection found.');
        }

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

run();
