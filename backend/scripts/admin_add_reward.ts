/**
 * 这是一个辅助脚本，用于在生产环境中添加成就并绑定到任务。
 * 使用方法：
 * 1. 确保已安装 axios: npm install axios
 * 2. 设置 ADMIN_TOKEN、API_URL 和 TARGET_TASK_ID 环境变量
 * 3. 运行脚本: npx ts-node scripts/admin_add_reward.ts
 */

import axios from 'axios';

// 配置区
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// 1. 定义新成就
const NEW_REWARD = {
    title: '夜游锦江',
    medal: '不夜城主',
    rarity: 5,
    image: 'https://images.unsplash.com/photo-1599558942289-53e020220684?q=80&w=2670&auto=format&fit=crop',
    description: '完成夜游锦江任务线'
};

// 2. 目标任务 ID (要绑定给哪个任务)
const TARGET_TASK_ID = process.env.TARGET_TASK_ID;

async function main() {
    if (!ADMIN_TOKEN || !TARGET_TASK_ID) {
        throw new Error('请设置 ADMIN_TOKEN 和 TARGET_TASK_ID 环境变量');
    }

    try {
        console.log('1. 创建新成就...');
        const rewardRes = await axios.post(`${API_URL}/rewards`, NEW_REWARD, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        const rewardId = rewardRes.data._id;
        console.log(`✅ 成就创建成功! ID: ${rewardId}`);

        console.log('2. 绑定成就到任务...');
        await axios.put(`${API_URL}/tasks/${TARGET_TASK_ID}`, {
            completionReward: rewardId
        }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });
        console.log(`✅ 绑定成功！现在完成任务 ${TARGET_TASK_ID} 将获得此成就。`);

    } catch (error: any) {
        console.error('❌ 操作失败:', error.response?.data || error.message);
    }
}

// 如需运行请取消注释
// main();
