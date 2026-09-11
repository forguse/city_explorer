
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city_explorer';

async function listUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        // Define minimalistic User schema/model just for reading
        const UserSchema = new mongoose.Schema({
            username: String,
            level: Number
        }, { strict: false });

        const User = mongoose.model('User', UserSchema, 'users');

        const users = await User.find({}).sort({ createdAt: -1 });
        console.log('---START---');
        users.forEach(u => {
            console.log(u.username);
        });
        console.log('---END---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listUsers();
