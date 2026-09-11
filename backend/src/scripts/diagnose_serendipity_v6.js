
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const LOG_FILE = path.join(__dirname, 'debug_output_v6.txt');

function log(msg) {
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { }
    console.log(msg);
}

async function run() {
    try {
        fs.writeFileSync(LOG_FILE, 'Creating debug log v6...\n');

        // 1. Connect (using discovered logic from v5)
        const paths = [
            'd:\\00_PROJECT\\city_explorer\\backend\\.env', // Most likely based on v5
            path.join(__dirname, '../../.env')
        ];

        for (const p of paths) {
            if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
        }
        if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://localhost:27017/city_explorer';

        await mongoose.connect(process.env.MONGO_URI);
        log('Connected.');

        // 2. Check Recent Executions
        const execCollection = mongoose.connection.collection('taskexecutions');
        const taskCollection = mongoose.connection.collection('tasks');

        // Get recent 5 executions
        const recentExecs = await execCollection.find({})
            .sort({ startedAt: -1 })
            .limit(5)
            .toArray();

        log(`\nFound ${recentExecs.length} recent executions:`);

        for (const exec of recentExecs) {
            const taskId = exec.task; // This is an OID
            const task = await taskCollection.findOne({ _id: taskId });

            log(`\nExecution ID: ${exec._id}`);
            log(`   Started At: ${exec.startedAt}`);
            log(`   Task Title: ${task ? task.title : 'UNKNOWN'}`);
            log(`   Task Cities: ${task ? JSON.stringify(task.targetCities) : 'N/A'}`);

            // Check Serendipity Match Logic
            const taskCities = task && task.targetCities ? task.targetCities : ['全国'];
            const citiesToCheck = taskCities.length > 0 ? taskCities : ['全国'];

            log(`   -> Effective Cities for Match: ${JSON.stringify(citiesToCheck)}`);
        }

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

run();
