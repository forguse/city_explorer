import mongoose, { Schema, Document } from 'mongoose';

export interface IPrepItemProgress {
    configId?: mongoose.Types.ObjectId; // Optional link to the config item
    title: string;
    kind?: 'ticket' | 'transport' | 'lodging' | 'documents' | 'other' | 'custom';
    isCompleted: boolean;
    note?: string;
    attachmentUrl?: string;
    // 扩展字段 - 用于存储用户输入的具体数据
    data?: {
        // 住宿相关
        hotelName?: string;
        hotelAddress?: string;
        checkInTime?: string;
        checkOutTime?: string;
        roomNumber?: string;
        // 交通相关
        trainNumber?: string;
        flightNumber?: string;
        departureTime?: string;
        arrivalTime?: string;
        seatInfo?: string;
        // 门票相关
        ticketCode?: string;        // 门票二维码内容或编号
        ticketQRCodeUrl?: string;   // 门票二维码图片
        ticketTime?: string;        // 入园时间
        // 证件相关
        documentType?: string;
        documentNumber?: string;
        documentImageUrl?: string;
        // 通用
        customFields?: Record<string, any>;
    };
}

export interface ITaskExecution extends Document {
    user: mongoose.Types.ObjectId;
    task: mongoose.Types.ObjectId;
    status: 'new' | 'scheduled' | 'ongoing' | 'completed';
    prepProgress: IPrepItemProgress[];
    completedNodes: number[]; // Indices of completed nodes in the Task.nodes array
    nodeRecords: {
        nodeIndex: number;
        note?: string;
        imageUrl?: string;
        imageUrls?: string[];  // 支持多图片
        recordedAt: Date;
        // 节点级问答结果
        qaResult?: {
            passed: boolean;
            attempts: number;
            lastInput?: string;
        };
    }[];
    nodeStartTimes: Map<string, Date>;  // 节点索引 -> 开始时间
    startTime?: Date;
    scheduledStartTime?: Date;
    completionTime?: Date;
    summaryNote?: string;
    summaryImageUrl?: string;
    isSuccess?: boolean; // 是否成功完成（满足所有限时要求）
    qaResult?: {
        passed: boolean;
        attempts: number;
        lastInput?: string;
    };
    coopContext?: {
        isHost: boolean;
        hostExecutionId?: mongoose.Types.ObjectId;
        participants: mongoose.Types.ObjectId[];
    };
    createdAt: Date;
    updatedAt: Date;
}

const PrepItemProgressSchema = new Schema({
    configId: { type: Schema.Types.ObjectId },
    title: { type: String, required: true },
    kind: { type: String, enum: ['ticket', 'transport', 'lodging', 'documents', 'other', 'custom'] },
    isCompleted: { type: Boolean, default: false },
    note: String,
    attachmentUrl: String,
    data: {
        // 住宿相关
        hotelName: String,
        hotelAddress: String,
        checkInTime: String,
        checkOutTime: String,
        roomNumber: String,
        // 交通相关
        trainNumber: String,
        flightNumber: String,
        departureTime: String,
        arrivalTime: String,
        seatInfo: String,
        // 门票相关
        ticketCode: String,
        ticketQRCodeUrl: String,
        ticketTime: String,
        // 证件相关
        documentType: String,
        documentNumber: String,
        documentImageUrl: String,
        // 通用
        customFields: { type: Schema.Types.Mixed }
    }
});

const TaskExecutionSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    status: {
        type: String,
        enum: ['new', 'scheduled', 'ongoing', 'completed'],
        default: 'new'
    },
    prepProgress: [PrepItemProgressSchema],
    completedNodes: [{ type: Number }], // Storing indices
    // 节点打卡记录 (Node Persistence)
    nodeRecords: [{
        nodeIndex: Number,
        note: { type: String, maxlength: 500 },
        imageUrl: String,
        imageUrls: [{ type: String }],  // 支持多图片
        recordedAt: { type: Date, default: Date.now },
        qaResult: {
            passed: Boolean,
            attempts: { type: Number, default: 0 },
            lastInput: String
        }
    }],
    nodeStartTimes: { type: Map, of: Date },  // 节点索引 -> 开始时间
    startTime: Date,
    scheduledStartTime: Date,
    completionTime: Date,
    summaryNote: { type: String, maxlength: 500 },
    summaryImageUrl: String,
    isSuccess: { type: Boolean, default: false },
    qaResult: {
        passed: { type: Boolean },
        attempts: { type: Number, default: 0 },
        lastInput: String
    },
    // 协作模式上下文
    coopContext: {
        isHost: { type: Boolean, default: true },
        hostExecutionId: { type: Schema.Types.ObjectId, ref: 'TaskExecution' }, // 如果不是Host，指向Host的记录
        participants: [{ type: Schema.Types.ObjectId, ref: 'User' }] // 包含Host和Guests
    }
}, {
    timestamps: true
});

// Composite index to ensure a user only has one active execution per task if needed, 
// or just for quicker lookup.
TaskExecutionSchema.index({ user: 1, task: 1 });

export default mongoose.model<ITaskExecution>('TaskExecution', TaskExecutionSchema);
