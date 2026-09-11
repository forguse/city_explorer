import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamMember {
    user: mongoose.Types.ObjectId;
    role: 'leader' | 'member';
    status: 'active' | 'done' | 'offline';
    location?: {
        name?: string;
        latitude?: number;
        longitude?: number;
    };
    completedNodes: number[];
    joinedAt: Date;
    lastActiveAt: Date;
}

export interface ITeam extends Document {
    name: string;
    code: string; // 邀请码，如 #8821
    task: mongoose.Types.ObjectId;
    execution?: mongoose.Types.ObjectId; // 关联的任务执行记录
    members: ITeamMember[];
    status: 'preparing' | 'ongoing' | 'completed' | 'disbanded';
    progress: number; // 0-100
    completedNodes: number[]; // 团队整体完成的节点
    totalNodes: number;
    startTime?: Date;
    endTime?: Date;
    timeLimit?: number; // 时间限制（秒）
    createdAt: Date;
    updatedAt: Date;
}

const TeamMemberSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['leader', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'done', 'offline'], default: 'active' },
    location: {
        name: String,
        latitude: Number,
        longitude: Number
    },
    completedNodes: [{ type: Number }],
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now }
}, { _id: false });

const TeamSchema: Schema = new Schema({
    name: { type: String, required: true, maxlength: 20 },
    code: { type: String, required: true, unique: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    execution: { type: Schema.Types.ObjectId, ref: 'TaskExecution' },
    members: [TeamMemberSchema],
    status: {
        type: String,
        enum: ['preparing', 'ongoing', 'completed', 'disbanded'],
        default: 'preparing'
    },
    progress: { type: Number, default: 0 },
    completedNodes: [{ type: Number }],
    totalNodes: { type: Number, default: 0 },
    startTime: Date,
    endTime: Date,
    timeLimit: { type: Number, default: 7200 } // 默认2小时
}, {
    timestamps: true
});

// 生成唯一邀请码
TeamSchema.statics.generateCode = async function (): Promise<string> {
    let code: string;
    let exists = true;
    while (exists) {
        code = '#' + Math.floor(1000 + Math.random() * 9000).toString();
        exists = await this.findOne({ code }) !== null;
    }
    return code!;
};

// 索引 (code 已通过 unique: true 自动创建索引)
TeamSchema.index({ 'members.user': 1 });
TeamSchema.index({ task: 1 });

export default mongoose.model<ITeam>('Team', TeamSchema);
