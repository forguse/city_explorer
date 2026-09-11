import mongoose from 'mongoose';
import InviteCode from '../src/models/InviteCode';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/city-explorer';

const main = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // 查询参数：--all 显示所有，--used 显示已使用，默认显示未使用
        const arg = process.argv[2];

        let query = {};
        let title = '未使用的邀请码';

        if (arg === '--all') {
            query = {};
            title = '所有邀请码';
        } else if (arg === '--used') {
            query = { isUsed: true };
            title = '已使用的邀请码';
        } else {
            query = { isUsed: false };
            title = '未使用的邀请码（可用）';
        }

        const codes = await InviteCode.find(query).sort({ createdAt: -1 });

        console.log(`📋 ${title}:`);
        console.log('=====================================');

        if (codes.length === 0) {
            console.log('（无）');
        } else {
            codes.forEach((code, index) => {
                const status = code.isUsed ? '❌ 已使用' : '✅ 可用';
                const usedInfo = code.isUsed && code.usedAt
                    ? ` (${code.usedAt.toLocaleDateString()})`
                    : '';
                console.log(`${index + 1}. ${code.code} - ${status}${usedInfo}`);
            });
        }

        console.log('=====================================');
        console.log(`总计: ${codes.length} 个\n`);

        // 统计信息
        const totalCount = await InviteCode.countDocuments();
        const usedCount = await InviteCode.countDocuments({ isUsed: true });
        const availableCount = await InviteCode.countDocuments({ isUsed: false });

        console.log('📊 统计:');
        console.log(`   总数: ${totalCount}`);
        console.log(`   已使用: ${usedCount}`);
        console.log(`   可用: ${availableCount}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

main();
