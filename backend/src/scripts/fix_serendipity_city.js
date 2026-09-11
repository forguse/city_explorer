
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const LOG_FILE = path.join(__dirname, 'debug_update_result.txt');

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

        const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');

        // Find the task from screenshot (loose partial ID match or by type)
        // User screenshot ID: 6572dd366475ddc72c474ba0 (I transcribed this earlier)
        // Let's first search by title "测试发布奇遇任务" to be sure

        const task = await Task.findOne({ title: "测试发布奇遇任务", taskType: 'serendipity' });

        if (task) {
            log(`Found Task: ${task.title} (ID: ${task._id})`);
            log(`Current Cities: ${JSON.stringify(task.targetCities)}`);

            // UPDATE
            task.targetCities = ['全国'];
            await Task.updateOne({ _id: task._id }, { $set: { targetCities: ['全国'] } });

            log(`UPDATED to ['全国']`);
            log('You can now trigger this task from ANY city execution.');
        } else {
            log('Could not find task "测试发布奇遇任务". Searching any serendipity...');
            const anyTask = await Task.findOne({ taskType: 'serendipity' });
            if (anyTask) {
                log(`Found fallback: ${anyTask.title} (ID: ${anyTask._id})`);
                await Task.updateOne({ _id: anyTask._id }, { $set: { targetCities: ['全国'] } });
                log(`UPDATED fallback task to ['全国']`);
            } else {
                log('No serendipity tasks found.');
            }
        }

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

run();
