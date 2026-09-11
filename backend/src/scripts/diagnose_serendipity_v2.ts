
// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    // Use 'any' to avoid strict TS checks on ad-hoc schemas
    const TaskSchema = new mongoose.Schema({}, { strict: false });
    const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema, 'tasks');

    const UserEncounterSchema = new mongoose.Schema({}, { strict: false });
    const UserEncounter = mongoose.models.UserEncounter || mongoose.model('UserEncounter', UserEncounterSchema, 'userencounters'); // Verify this collection name

    console.log('\n--- 1. Checking Active User Encounters ---');
    const activeEncounters = await UserEncounter.find({ status: 'active' });
    if (activeEncounters.length > 0) {
        console.log(`[!] Found ${activeEncounters.length} ACTIVE active encounters (Blocking new triggers).`);
        activeEncounters.forEach((e: any) => console.log(` - EncounterID: ${e._id}, User: ${e.user}, Task: ${e.serendipityTask}`));
    } else {
        console.log('[OK] No active encounters found.');
    }

    console.log('\n--- 2. Checking Serendipity Tasks ---');
    const tasks = await Task.find({ taskType: 'serendipity', isDeleted: { $ne: true } });
    console.log(`Total found: ${tasks.length}`);

    tasks.forEach((t: any) => {
        console.log(`- [${t.status}] ${t.title} (Cities: ${JSON.stringify(t.targetCities)})`);
    });

    const approved = tasks.filter((t: any) => t.status === 'approved');
    console.log(`Approved & Ready: ${approved.length}`);

    process.exit();
};

run();
