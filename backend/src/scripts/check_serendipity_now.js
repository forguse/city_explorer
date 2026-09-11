const mongoose = require('mongoose');

async function run() {
    await mongoose.connect('mongodb://localhost:27017/city_explorer');

    const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');

    const serendipityTask = await Task.findOne({ taskType: 'serendipity' });

    console.log('=== Serendipity Task Details ===');
    console.log('Title:', serendipityTask.title);
    console.log('targetCities:', serendipityTask.targetCities);
    console.log('targetCities type:', Array.isArray(serendipityTask.targetCities));
    console.log('targetCities length:', serendipityTask.targetCities?.length);
    console.log('First city:', serendipityTask.targetCities?.[0]);
    console.log('');

    // 测试精确匹配
    if (serendipityTask.targetCities?.[0]) {
        const city = serendipityTask.targetCities[0];
        console.log(`Testing match with: "${city}"`);

        const matched = await Task.find({
            taskType: 'serendipity',
            targetCities: { $in: [city] }
        });
        console.log('Matched:', matched.length);
    }

    await mongoose.disconnect();
}

run().catch(console.error);
