
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

// Define minimal schemas (loose mode)
const TaskSchema = new mongoose.Schema({}, { strict: false });
const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

const UserEncounterSchema = new mongoose.Schema({}, { strict: false });
const UserEncounter = mongoose.models.UserEncounter || mongoose.model('UserEncounter', UserEncounterSchema);

const diagnose = async () => {
    await connectDB();

    console.log('\n--- 1. Checking Active User Encounters ---');
    const activeEncounters = await UserEncounter.find({ status: 'active' });
    if (activeEncounters.length > 0) {
        console.log(`[!] Found ${activeEncounters.length} ACTIVE encounters. This PREVENTS new triggers.`);
        activeEncounters.forEach(e => console.log(` - User: ${e.user}, Task: ${e.serendipityTask}`));
    } else {
        console.log('[OK] No active encounters found. (Good for triggering)');
    }

    console.log('\n--- 2. Checking Serendipity Tasks Definitions ---');
    const tasks = await Task.find({ taskType: 'serendipity', isDeleted: { $ne: true } });
    console.log(`Found ${tasks.length} serendipity tasks in total.`);

    tasks.forEach(t => {
        const approved = t.status === 'approved';
        console.log(`[${approved ? 'APPROVED' : 'PENDING'}] ID: ${t._id}`);
        console.log(`    Title: ${t.title}`);
        console.log(`    Cities: ${JSON.stringify(t.targetCities)}`);
    });

    const approvedTasks = tasks.filter(t => t.status === 'approved');
    if (approvedTasks.length === 0) {
        console.log('[CRITICAL] No APPROVED serendipity tasks found!');
    } else {
        console.log(`\n[OK] Found ${approvedTasks.length} APPROVED serendipity tasks ready to trigger.`);
    }

    process.exit();
};

diagnose();
