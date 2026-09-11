
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const LOG_FILE = path.join(__dirname, 'debug_output_v7.txt');

function log(msg) {
    try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch (e) { }
    console.log(msg);
}

async function run() {
    try {
        fs.writeFileSync(LOG_FILE, 'Creating debug log v7...\n');

        // Connect
        const paths = ['d:\\00_PROJECT\\city_explorer\\backend\\.env', path.join(__dirname, '../../.env')];
        for (const p of paths) { if (fs.existsSync(p)) { dotenv.config({ path: p }); break; } }
        if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://localhost:27017/city_explorer';
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected.');

        const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');

        // SIMULATE THE BACKEND QUERY
        const cities = ["北京市"]; // Scenario
        log(`\nTesting Aggregation with cities: ${JSON.stringify(cities)}`);

        const pipeline = [
            {
                $match: {
                    taskType: 'serendipity',
                    status: 'approved',
                    isDeleted: { $ne: true },
                    $or: [
                        { targetCities: { $in: cities } },
                        { targetCities: { $in: ['全国'] } },
                        { targetCities: { $size: 0 } }
                    ]
                }
            },
            { $sample: { size: 1 } }
        ];

        log('Pipeline: ' + JSON.stringify(pipeline, null, 2));

        const results = await Task.aggregate(pipeline);
        log(`\nResults count: ${results.length}`);

        if (results.length > 0) {
            log('MATCHED TASK:');
            log(JSON.stringify(results[0], null, 2));
        } else {
            log('NO MATCHES FOUND!');

            // Debug: Why?
            log('\nDebugging non-match...');
            const allSerendipity = await Task.find({ taskType: 'serendipity' });
            for (const t of allSerendipity) {
                log(`Task ${t._id}: type=${t.taskType}, status=${t.status}, deleted=${t.isDeleted}, cities=${JSON.stringify(t.targetCities)}`);
            }
        }

    } catch (e) {
        log(`ERROR: ${e.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

run();
