import mongoose, { Schema, Document } from 'mongoose';

// 节点级问答模块
export interface INodeQAModule {
    enabled: boolean;
    question: string;
    correctAnswers: string[];     // 答案数组，匹配任一即算对（模糊匹配）
    maxAttempts: number;          // 最大尝试次数，默认3
}

export interface ITaskNode {
    description: string;
    isLocationSpecific: boolean;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    location?: {
        name: string;
    };
    referenceImageUrl?: string;
    timeLimit?: ITaskNodeTimeLimit; // 节点时间限制
    qaModule?: INodeQAModule;       // 节点级问答（可选）
}

export interface IPrepItemConfig {
    _id?: mongoose.Types.ObjectId;
    title: string;
    type: 'ticket' | 'transport' | 'lodging' | 'documents' | 'other';
    defaultNote?: string;
}

// 赞助商奖励配置
export interface ISponsorReward {
    sponsorName: string;           // 赞助商名称
    title: string;                 // 奖励标题
    discountValue: string;         // 折扣值
    discountUnit: string;          // 折扣单位 (折, 元, %OFF)
    description: string;           // 描述
    expiry: string;                // 有效期
    image?: string;                // 奖励图片
    bgImage?: string;              // 背景图片
    code?: string;                 // 优惠码
}

// 节点时间限制配置
export interface ITaskNodeTimeLimit {
    type: 'countdown' | 'timeRange' | 'deadline' | 'none';
    // 倒计时：必须在指定时间内完成（分钟）
    countdownMinutes?: number;
    // 时间段：每天的某时段内 "HH:MM"
    timeRangeStart?: string;
    timeRangeEnd?: string;
    timeRangeDate?: string;      // 可选日期 "YYYY-MM-DD"，不设置则每天重复
    // 时间点：某时间之前/之后 "HH:MM"
    deadlineTime?: string;
    deadlineType?: 'before' | 'after';
    deadlineDate?: string;       // 可选日期 "YYYY-MM-DD"，不设置则每天重复
}

// 奇遇任务配置
export interface ISerendipityConfig {
    expiryDays: number;           // 生命周期天数，默认3天
    executionWindow?: {           // 执行时间窗口
        enabled: boolean;
        startTime: string;        // "HH:MM" 格式
        endTime: string;
    };
    successMessage?: string;      // 完成后的赠言
    successImageUrl?: string;     // 赠言图片URL
}

// 问答模块配置（普通任务和奇遇任务都可用）
export interface IQAModule {
    enabled: boolean;
    question: string;
    correctAnswers: string[];     // 答案数组，匹配任一即算对（模糊匹配）
    maxAttempts: number;          // 最大尝试次数，默认3
}

// 任务时间配置
export interface ITaskTimeConfig {
    // 时间挑战（节点/整体限时）
    hasTimeChallenge: boolean;
    taskTimeLimit?: ITaskNodeTimeLimit;  // 整个任务的限时

    // 活动任务（有效期）
    isEventTask: boolean;
    eventStartDate?: Date;
    eventEndDate?: Date;
    maxParticipants?: number;  // 活动人数上限，默认18
}

export interface ITask extends Document {
    title: string;
    description: string;
    taskType: 'normal' | 'serendipity';  // 任务类型，默认 normal
    location: {
        name: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    coverImageUrl?: string;
    difficulty: number; // 1-5
    // 奇遇任务配置（仅当 taskType === 'serendipity' 时有效）
    serendipityConfig?: ISerendipityConfig;
    // 注意：问答模块已移至节点级别 (ITaskNode.qaModule)
    author: mongoose.Types.ObjectId;
    clubId?: mongoose.Types.ObjectId;  // 关联社团ID（社团活动任务）
    nodes: ITaskNode[];
    isAI: boolean;
    isOfficial: boolean;
    prepListConfig: IPrepItemConfig[];
    completionImageUrl?: string;
    // 点赞
    likes: mongoose.Types.ObjectId[]; // 点赞用户列表
    viewCount: number;
    // 时间配置
    timeConfig?: ITaskTimeConfig;
    // 审核相关字段
    status: 'pending' | 'approved' | 'rejected' | 'private'; // 审核状态
    reviewedBy: mongoose.Types.ObjectId[]; // 审核通过的用户列表
    reviewCount: number; // 审核通过的人数
    reportedBy: mongoose.Types.ObjectId[]; // 举报的用户列表
    reportCount: number; // 举报次数
    approvedBy?: mongoose.Types.ObjectId; // 管理员审核时记录
    approvedAt?: Date; // 审核通过时间
    rejectionReason?: string; // 拒绝原因
    // 赞助商奖励
    isSponsored: boolean; // 是否为赞助商任务
    sponsorReward?: ISponsorReward; // 赞助商奖励配置
    isDeleted?: boolean; // 软删除标记
    createdAt: Date;
    updatedAt: Date;
}

// 节点时间限制 Schema
const TaskNodeTimeLimitSchema = new Schema({
    type: { type: String, enum: ['countdown', 'timeRange', 'deadline', 'none'], default: 'none' },
    countdownMinutes: Number,
    timeRangeStart: String,
    timeRangeEnd: String,
    timeRangeDate: String,
    deadlineTime: String,
    deadlineType: { type: String, enum: ['before', 'after'] },
    deadlineDate: String
}, { _id: false });

const TaskNodeSchema = new Schema({
    description: { type: String, required: true, maxlength: 200 },
    isLocationSpecific: { type: Boolean, default: false },
    coordinates: {
        latitude: Number,
        longitude: Number
    },
    location: {
        name: { type: String }
    },
    referenceImageUrl: String,
    timeLimit: TaskNodeTimeLimitSchema,
    qaModule: {  // 节点级问答
        enabled: { type: Boolean, default: false },
        question: { type: String, maxlength: 50 },
        correctAnswers: [{ type: String, maxlength: 50 }],
        maxAttempts: { type: Number, default: 3 }
    }
}, { _id: false });

const PrepItemConfigSchema = new Schema({
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['ticket', 'transport', 'lodging', 'documents', 'other'],
        required: true
    },
    defaultNote: String
});

// 赞助商奖励 Schema
const SponsorRewardSchema = new Schema({
    sponsorName: { type: String, required: true },
    title: { type: String, required: true },
    discountValue: { type: String, required: true },
    discountUnit: { type: String, required: true },
    description: { type: String, required: true },
    expiry: { type: String, required: true },
    image: { type: String },
    bgImage: { type: String },
    code: { type: String }
}, { _id: false });

// 奇遇任务配置 Schema
const SerendipityConfigSchema = new Schema({
    expiryDays: { type: Number, default: 3 },
    executionWindow: {
        enabled: { type: Boolean, default: false },
        startTime: String,
        endTime: String
    },
    successMessage: { type: String, maxlength: 100 },
    successImageUrl: String
}, { _id: false });

// 问答模块 Schema
const QAModuleSchema = new Schema({
    enabled: { type: Boolean, default: false },
    question: String,
    correctAnswers: [String],
    maxAttempts: { type: Number, default: 3 }
}, { _id: false });

// 任务时间配置 Schema
const TaskTimeConfigSchema = new Schema({
    hasTimeChallenge: { type: Boolean, default: false },
    taskTimeLimit: TaskNodeTimeLimitSchema,
    isEventTask: { type: Boolean, default: false },
    eventStartDate: { type: Date },
    eventEndDate: { type: Date },
    maxParticipants: { type: Number, default: 18, max: 18 }
}, { _id: false });

const TaskSchema: Schema = new Schema({
    title: { type: String, required: true, maxlength: 20 },
    description: { type: String, required: true, maxlength: 300 },
    taskType: { type: String, enum: ['normal', 'serendipity'], default: 'normal' },
    targetCities: { type: [String], default: [] }, // 任务目标城市 (省-市 格式或直辖市名)
    location: {
        name: { type: String, required: false, default: '' }, // Deprecated but kept for compatibility
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    coverImageUrl: { type: String },
    difficulty: { type: Number, min: 1, max: 5, default: 1 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clubId: { type: Schema.Types.ObjectId, ref: 'Club' },  // 社团活动关联
    nodes: [TaskNodeSchema],
    isAI: { type: Boolean, default: false },
    isOfficial: { type: Boolean, default: false },
    prepListConfig: [PrepItemConfigSchema],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    viewCount: { type: Number, default: 0 },
    completionReward: { type: Schema.Types.ObjectId, ref: 'Reward' },
    completionMessage: { type: String, maxlength: 100 }, // User defined proverb for task completion
    completionImageUrl: { type: String },
    // 奇遇任务配置
    serendipityConfig: SerendipityConfigSchema,
    // 注意：qaModule 已移至节点级别 (nodes[].qaModule)
    // 时间配置
    timeConfig: TaskTimeConfigSchema,
    // 审核相关字段
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'private'], default: 'pending' },
    reviewedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reviewCount: { type: Number, default: 0 },
    reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportCount: { type: Number, default: 0 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    // 赞助商奖励
    isSponsored: { type: Boolean, default: false },
    sponsorReward: SponsorRewardSchema,
    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Add index for city filtering
TaskSchema.index({ targetCities: 1 });
TaskSchema.index({ targetCities: 1, createdAt: -1 }); // Compound for sorted queries

export default mongoose.model<ITask>('Task', TaskSchema);
