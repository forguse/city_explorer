const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { MONGODB_URI, RESET_EMAIL, RESET_PASSWORD } = process.env;

if (!MONGODB_URI || !RESET_EMAIL || !RESET_PASSWORD) {
    console.error('请设置 MONGODB_URI、RESET_EMAIL 和 RESET_PASSWORD 环境变量。');
    process.exit(1);
}

async function resetPassword() {
    try {
        await mongoose.connect(MONGODB_URI);

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const user = await User.findOne({ email: RESET_EMAIL });

        if (!user) {
            throw new Error('未找到指定用户');
        }

        const newPasswordHash = await bcrypt.hash(RESET_PASSWORD, 10);
        user.passwordHash = newPasswordHash;
        await user.save();

        const isMatch = await bcrypt.compare(RESET_PASSWORD, newPasswordHash);
        console.log(isMatch ? '密码重置成功' : '密码重置后的校验失败');
        process.exitCode = isMatch ? 0 : 1;
    } catch (error) {
        console.error('密码重置失败:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
}

resetPassword();
