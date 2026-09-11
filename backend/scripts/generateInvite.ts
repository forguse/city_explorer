import mongoose from 'mongoose';
import InviteCode from '../src/models/InviteCode';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city-explorer';

const generateRandomCode = (length: number = 6): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const main = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get count from args, default to 1
        const count = parseInt(process.argv[2]) || 1;

        console.log(`Generating ${count} invite codes...`);

        const generatedCodes: string[] = [];

        for (let i = 0; i < count; i++) {
            let code = generateRandomCode();
            // Simple collision check (rare for 6 chars but good practice)
            while (await InviteCode.findOne({ code })) {
                code = generateRandomCode();
            }

            await InviteCode.create({ code });
            generatedCodes.push(code);
        }

        console.log('\n✅ Successfully generated invite codes:');
        console.log('=====================================');
        generatedCodes.forEach(code => console.log(code));
        console.log('=====================================');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

main();
