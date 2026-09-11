// 临时脚本：添加已完成奇遇测试记录
import mongoose from 'mongoose';
import User from './src/models/User';
import Task from './src/models/Task';
import TaskExecution from './src/models/TaskExecution';
import UserEncounter from './src/models/UserEncounter';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/city_explorer';

async function addCompletedEncounter() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({});
        const serendipityTask = await Task.findOne({ taskType: 'serendipity' });
        const execution = await TaskExecution.findOne({ user: user?._id });

        if (!user) {
            console.error('No user found');
            process.exit(1);
        }
        if (!serendipityTask) {
            console.error('No serendipity task found');
            process.exit(1);
        }
        if (!execution) {
            console.error('No execution found');
            process.exit(1);
        }

        const encounter = new UserEncounter({
            user: user._id,
            serendipityTask: serendipityTask._id,
            triggerTaskExecution: execution._id,
            status: 'completed',
            triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            completedAt: new Date(),
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });

        await encounter.save();
        console.log('Created completed encounter:', encounter._id);
        console.log('User:', user.username);
        console.log('Task:', serendipityTask.title);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addCompletedEncounter();
