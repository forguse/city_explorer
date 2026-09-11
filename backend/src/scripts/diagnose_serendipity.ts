
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Color helper functions
const colors = {
    cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
    yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
    red: (str: string) => `\x1b[31m${str}\x1b[0m`,
    green: (str: string) => `\x1b[32m${str}\x1b[0m`,
};

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log(colors.cyan('MongoDB Connected'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

// Define minimal schemas if models aren't available/exportable in script context easily
const TaskSchema = new mongoose.Schema({
    title: String,
    taskType: String,
    status: String,
    targetCities: [String],
    isDeleted: Boolean
});
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

const UserEncounterSchema = new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    status: String,
    serendipityTask: mongoose.Schema.Types.ObjectId
});
const UserEncounter = mongoose.models.UserEncounter || mongoose.model('UserEncounter', UserEncounterSchema);

const diagnose = async () => {
    await connectDB();

    console.log(colors.yellow('\n--- 1. Checking Active User Encounters ---'));
    const activeEncounters = await UserEncounter.find({ status: 'active' });
    if (activeEncounters.length > 0) {
        console.log(colors.red(`Found ${activeEncounters.length} ACTIVE encounters. This PREVENTS new triggers.`));
        activeEncounters.forEach(e => console.log(` - User: ${e.user}, Task: ${e.serendipityTask}`));
    } else {
        console.log(colors.green('No active encounters found. (Good for triggering)'));
    }

    console.log(colors.yellow('\n--- 2. Checking Serendipity Tasks Definitions ---'));
    const tasks = await Task.find({ taskType: 'serendipity', isDeleted: { $ne: true } });
    console.log(`Found ${tasks.length} serendipity tasks in total (including unapproved).`);

    tasks.forEach(t => {
        const colorFn = t.status === 'approved' ? colors.green : colors.red;
        console.log(`[${colorFn(t.status as string)}] ID: ${t._id}, Title: ${t.title}, Cities: ${JSON.stringify(t.targetCities)}`);
    });

    const approvedTasks = tasks.filter(t => t.status === 'approved');
    if (approvedTasks.length === 0) {
        console.log(colors.red('CRITICAL: No APPROVED serendipity tasks found!'));
    } else {
        console.log(colors.green(`\nFound ${approvedTasks.length} APPROVED serendipity tasks ready to trigger.`));
    }

    process.exit();
};

diagnose();
