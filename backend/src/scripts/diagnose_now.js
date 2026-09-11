const mongoose = require('mongoose');

async function run() {
    await mongoose.connect('mongodb://localhost:27017/city_explorer');
    console.log('Connected');

    const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
    const UserEncounter = mongoose.model('UserEncounter', new mongoose.Schema({}, { strict: false }), 'userencounters');

    // 检查奇遇任务
    const serendipityTasks = await Task.find({ taskType: 'serendipity', isDeleted: { $ne: true } });
    console.log('\n=== Serendipity Tasks ===');
    console.log('Total:', serendipityTasks.length);
    serendipityTasks.forEach(t => {
        console.log('---');
        console.log('  Title:', t.title);
        console.log('  Status:', t.status);
        console.log('  Cities:', JSON.stringify(t.targetCities));
        console.log('  QA Enabled:', t.nodes?.[0]?.qaModule?.enabled ? 'YES' : 'NO');
    });

    // 检查活动/放弃的奇遇
    const allEnc = await UserEncounter.find({});
    console.log('\n=== All User Encounters ===');
    console.log('Total:', allEnc.length);
    allEnc.forEach(e => console.log('  Status:', e.status, '| ID:', e._id));

    // 检查普通任务的问答设置
    const tasksWithQA = await Task.find({
        taskType: { $ne: 'serendipity' },
        'nodes.qaModule.enabled': true,
        isDeleted: { $ne: true }
    });
    console.log('\n=== Normal Tasks with QA ===');
    console.log('Total:', tasksWithQA.length);
    tasksWithQA.forEach(t => {
        console.log('  Title:', t.title);
        t.nodes?.forEach((n, i) => {
            if (n.qaModule?.enabled) {
                console.log('    Node', i, '- QA Question:', n.qaModule.question);
            }
        });
    });

    await mongoose.disconnect();
}

run().catch(console.error);
