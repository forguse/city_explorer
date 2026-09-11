
import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const deactivateUser = async (identifier: string) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        // Find user by ID or Username
        const user = await User.findOne({
            $or: [
                { _id: mongoose.isValidObjectId(identifier) ? identifier : null },
                { username: identifier }
            ]
        });

        if (!user) {
            console.error('User not found!');
            process.exit(1);
        }

        console.log(`Found user: ${user.username} (${user._id})`);

        if (user.username === '已注销用户' && user.email === null) {
            console.log('User is already deactivated.');
            process.exit(0);
        }

        // --- Anonymization Process ---
        // 1. Clear sensitive info
        user.email = `deactivated_${user._id}_${Date.now()}@cityexplorer.com`;
        user.passwordHash = 'DEACTIVATED_ACCOUNT_' + Date.now(); // Scramble password

        // 2. Anonymize public profile
        const oldUsername = user.username;
        user.username = `已注销用户_${user._id.toString().slice(-4)}`; // Keep unique index happy but anonymous
        user.bio = '此账号已注销';
        user.avatarUrl = 'https://via.placeholder.com/150?text=Deactivated'; // Default/Dead avatar

        // 3. (Optional) Set a flag if your schema supports it, otherwise these changes are enough
        // user.isDeleted = true; 

        await user.save();

        console.log(`\nSUCCESS: User "${oldUsername}" has been deactivated.`);
        console.log('------------------------------------------------');
        console.log('Results:');
        console.log(`- Username: ${user.username}`);
        console.log(`- Email: ${user.email}`);
        console.log(`- Password: [Scrambled]`);
        console.log(`- Posts/Comments: Preserved but attributed to "${user.username}"`);
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('Error deactivating user:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: npm run deactivate <userId_or_username>');
    console.log('Example: npm run deactivate testuser');
    process.exit(1);
}

deactivateUser(args[0]);
