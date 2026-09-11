
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const LOG_FILE = path.join(__dirname, 'debug_exec_details.txt');

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

        const Exec = mongoose.connection.collection('taskexecutions');
        const Task = mongoose.connection.collection('tasks');

        // Get latest execution
        const latest = await Exec.find({}).sort({ startedAt: -1 }).limit(1).toArray();
        if (latest.length === 0) {
            log('No executions found.');
            return;
        }

        const exec = latest[0];
        const task = await Task.findOne({ _id: exec.task });

        log(`\n--- LATEST EXECUTION ---`);
        log(`Exec ID: ${exec._id}`);
        log(`User ID: ${exec.user}`);
        log(`StartedAt: ${exec.startedAt}`);
        log(`Completed Nodes: ${exec.completedNodes ? exec.completedNodes.length : 0}`);

        if (task) {
            log(`\n--- TASK DETAILS ---`);
            log(`Title: ${task.title}`);
            log(`Node Count: ${task.nodes ? task.nodes.length : 0}`);
            log(`Cities: ${JSON.stringify(task.targetCities)}`);

            const nodeCount = task.nodes ? task.nodes.length : 0;
            if (nodeCount <= 2) {
                log(`\n[WARNING] Node count is ${nodeCount}. Trigger might require DEBUG_MODE=true.`);
            } else {
                log(`\n[OK] Node count ${nodeCount} is sufficient.`);
            }
        } else {
            log('\n[ERROR] Task not found for this execution.');
        }

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

run();
