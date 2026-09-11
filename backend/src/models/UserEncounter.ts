import mongoose, { Schema, Document } from 'mongoose';

export interface IUserEncounter extends Document {
    user: mongoose.Types.ObjectId;
    serendipityTask: mongoose.Types.ObjectId;  // 关联奇遇任务（Task 类型为 serendipity）
    triggerTaskExecution: mongoose.Types.ObjectId;  // 触发此奇遇的正在执行的任务

    status: 'active' | 'completed' | 'failed' | 'expired' | 'abandoned';

    // 生命周期
    triggeredAt: Date;          // 触发时间
    expiresAt: Date;            // 过期时间 = triggeredAt + expiryDays

    // 问答记录
    qaAttempts: number;         // 已尝试次数
    qaUserInputs: string[];     // 历史输入记录

    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserEncounterSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serendipityTask: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    triggerTaskExecution: { type: Schema.Types.ObjectId, ref: 'TaskExecution', required: true },
    status: {
        type: String,
        enum: ['active', 'completed', 'failed', 'expired', 'abandoned'],
        default: 'active'
    },
    triggeredAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    qaAttempts: { type: Number, default: 0 },
    qaUserInputs: [{ type: String }],
    completedAt: { type: Date }
}, {
    timestamps: true
});

// 索引：查询用户的活动奇遇
UserEncounterSchema.index({ user: 1, status: 1 });
// 索引：过期检查
UserEncounterSchema.index({ expiresAt: 1 });

// TTL 索引：已放弃的奇遇在 3 天（259200秒）后从数据库自动彻底删除
// 这样可以释放"2次触发限制"，让用户有机会再次遇到该奇遇
UserEncounterSchema.index(
    { updatedAt: 1 },
    {
        expireAfterSeconds: 3 * 24 * 60 * 60,
        partialFilterExpression: { status: 'abandoned' }
    }
);

export default mongoose.model<IUserEncounter>('UserEncounter', UserEncounterSchema);
