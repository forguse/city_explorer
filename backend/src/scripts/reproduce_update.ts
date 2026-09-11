
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city_explorer';

async function reproduceUpdate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const UserSchema = new mongoose.Schema({
            username: String,
            passwordHash: String
        }, { strict: false });

        const User = mongoose.model('User', UserSchema, 'users');

        // 1. Create Initial User
        const initName = `Repro_${Date.now()}`;
        const user = await User.create({ username: initName, passwordHash: 'hash' });
        console.log(`1. Created User: ${user.username} (ID: ${user._id})`);

        // 2. Simulate Update (Code from userController)
        console.log('2. Updating User...');
        const userToUpdate = await User.findById(user._id);
        if (userToUpdate) {
            userToUpdate.username = `${initName}_EDITED`;
            await userToUpdate.save();
            console.log(`   Updated to: ${userToUpdate.username}`);
        }

        // 3. Verify
        const oldUser = await User.findOne({ username: initName });
        const newUser = await User.findOne({ username: `${initName}_EDITED` });

        if (oldUser && newUser && oldUser._id.toString() !== newUser._id.toString()) {
            console.log('CRITICAL_FAIL');
        } else if (newUser && !oldUser) {
            console.log('SUCCESS_PASS');
        } else {
            console.log('UNKNOWN_STATE', oldUser?._id, newUser?._id);
        }

        // Cleanup
        await User.deleteOne({ _id: user._id });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

reproduceUpdate();
