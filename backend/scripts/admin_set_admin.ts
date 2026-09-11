/**
 * 管理员设置脚本
 * 用法: npx ts-node scripts/admin_set_admin.ts <用户名>
 * 
 * 示例:
 *   npx ts-node scripts/admin_set_admin.ts myusername
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../src/models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city_explorer';

async function setAdmin(username: string) {
    try {
        console.log('🔌 正在连接数据库...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ 数据库连接成功');

        // 查找用户
        const user = await User.findOne({ username });
        
        if (!user) {
            console.log(`❌ 未找到用户: ${username}`);
            console.log('\n📋 当前所有用户:');
            const allUsers = await User.find({}, 'username isAdmin level');
            allUsers.forEach(u => {
                console.log(`   - ${u.username} ${u.isAdmin ? '(管理员)' : ''}`);
            });
            process.exit(1);
        }

        if (user.isAdmin) {
            console.log(`ℹ️  用户 "${username}" 已经是管理员了`);
        } else {
            user.isAdmin = true;
            await user.save();
            console.log(`✅ 成功将用户 "${username}" 设置为管理员!`);
        }

        // 显示用户信息
        console.log('\n📊 用户信息:');
        console.log(`   ID: ${user._id}`);
        console.log(`   用户名: ${user.username}`);
        console.log(`   等级: ${user.level}`);
        console.log(`   管理员: ${user.isAdmin ? '是' : '否'}`);

    } catch (error) {
        console.error('❌ 错误:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 数据库连接已断开');
    }
}

// 获取命令行参数
const username = process.argv[2];

if (!username) {
    console.log('❌ 请提供用户名');
    console.log('用法: npx ts-node scripts/admin_set_admin.ts <用户名>');
    console.log('示例: npx ts-node scripts/admin_set_admin.ts myusername');
    process.exit(1);
}

setAdmin(username);
