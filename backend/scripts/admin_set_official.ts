/**
 * 设置官方推荐任务脚本
 * 用法: 
 *   npx ts-node scripts/admin_set_official.ts <任务ID> [true|false]
 *   npx ts-node scripts/admin_set_official.ts list  # 列出所有任务
 * 
 * 示例:
 *   npx ts-node scripts/admin_set_official.ts 507f1f77bcf86cd799439011 true
 *   npx ts-node scripts/admin_set_official.ts list
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Task from '../src/models/Task';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city_explorer';

async function listTasks() {
    console.log('\n📋 所有任务列表:');
    console.log('─'.repeat(80));
    
    const tasks = await Task.find({}).populate('author', 'username').sort({ createdAt: -1 });
    
    if (tasks.length === 0) {
        console.log('   暂无任务');
        return;
    }

    tasks.forEach((task, index) => {
        const official = task.isOfficial ? '✅ 官方' : '   普通';
        const author = (task.author as any)?.username || '未知';
        console.log(`${index + 1}. [${official}] ${task.title}`);
        console.log(`   ID: ${task._id}`);
        console.log(`   作者: ${author} | 难度: ${task.difficulty}`);
        console.log('');
    });
    
    console.log('─'.repeat(80));
    console.log(`共 ${tasks.length} 个任务，其中 ${tasks.filter(t => t.isOfficial).length} 个为官方推荐`);
}

async function setOfficial(taskId: string, isOfficial: boolean) {
    // 验证 ObjectId 格式
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        console.log(`❌ 无效的任务ID格式: ${taskId}`);
        process.exit(1);
    }

    const task = await Task.findById(taskId);
    
    if (!task) {
        console.log(`❌ 未找到任务: ${taskId}`);
        await listTasks();
        process.exit(1);
    }

    task.isOfficial = isOfficial;
    await task.save();
    
    console.log(`✅ 任务 "${task.title}" 已${isOfficial ? '设为官方推荐' : '取消官方推荐'}`);
    console.log(`   ID: ${task._id}`);
}

async function main() {
    try {
        console.log('🔌 正在连接数据库...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ 数据库连接成功');

        const arg1 = process.argv[2];
        const arg2 = process.argv[3];

        if (!arg1) {
            console.log('❌ 请提供参数');
            console.log('用法:');
            console.log('  npx ts-node scripts/admin_set_official.ts list');
            console.log('  npx ts-node scripts/admin_set_official.ts <任务ID> [true|false]');
            process.exit(1);
        }

        if (arg1 === 'list') {
            await listTasks();
        } else {
            const isOfficial = arg2 !== 'false'; // 默认为 true
            await setOfficial(arg1, isOfficial);
        }

    } catch (error) {
        console.error('❌ 错误:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 数据库连接已断开');
    }
}

main();
