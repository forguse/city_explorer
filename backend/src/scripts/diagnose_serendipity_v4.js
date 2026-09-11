
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const LOG_FILE = path.join(__dirname, 'debug_output.txt');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg); // also console
}

async function run() {
    try {
        fs.writeFileSync(LOG_FILE, 'Creating debug log...\n');
        log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected.');

        // 1. Check Specific Serendipity Task from screenshot
        const tasksCollection = mongoose.connection.collection('tasks');
        const specificId = new mongoose.Types.ObjectId('000000000000000000000000');
        const task = await tasksCollection.findOne({ _id: specificId });

        if (task) {
            log(`\nTARGET TASK FOUND: ${task.title}`);
            log(`Status: ${task.status}`);
            log(`TaskType: ${task.taskType}`);
            log(`TargetCities: ${JSON.stringify(task.targetCities)}`);
        } else {
            log('\n[!] Target task 000000000000000000000000 NOT FOUND');
            // List all serendipity
            const all = await tasksCollection.find({ taskType: 'serendipity' }).toArray();
            log(`Found ${all.length} other serendipity tasks.`);
        }

        // 2. Check Encounters
        // List all collections to find the right one
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
