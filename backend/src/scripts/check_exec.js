const mongoose = require('mongoose');

async function run() {
    await mongoose.connect('mongodb://localhost:27017/city_explorer');

    const TaskExecution = mongoose.model('TaskExecution', new mongoose.Schema({}, { strict: false }), 'taskexecutions');

    // 查找任务ID包含 6972e55 的执行记录
    const execs = await TaskExecution.find({}).sort({ updatedAt: -1 }).limit(10);

    console.log('Recent executions:');
    execs.forEach(e => {
        const taskId = e.task?.toString() || 'unknown';
        if (taskId.includes('6972e55') || taskId.includes('000000000000000000000000')) {
            console.log('>>> FOUND:', e._id, '| Status:', e.status, '| Task:', taskId);
        } else {
            console.log('  ID:', e._id, '| Status:', e.status, '| Task:', taskId);
        }
    });

    // 额外检查特定任务
    const specific = await TaskExecution.find({ task: new mongoose.Types.ObjectId('000000000000000000000000') });
    console.log('\nExecutions for 000000000000000000000000:', specific.length);
    specific.forEach(e => console.log('  Status:', e.status, '| ID:', e._id));

    await mongoose.disconnect();
}

run().catch(console.error);
