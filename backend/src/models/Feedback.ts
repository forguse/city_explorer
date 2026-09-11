import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    user: mongoose.Types.ObjectId; // 反馈用户
    type: 'post_deleted' | 'task_rejected' | 'other'; // 反馈类型
    relatedId?: mongoose.Types.ObjectId; // 相关内容ID（帖子/任务）
    content: string; // 反馈内容
    status: 'pending' | 'approved' | 'rejected'; // 处理状态
    processedBy?: mongoose.Types.ObjectId; // 处理人
    processedAt?: Date; // 处理时间
    adminNote?: string; // 管理员备注
    compensation?: {
        type: string; // 补偿类型
        amount: number; // 补偿数量
        given: boolean; // 是否已发放
    };
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['post_deleted', 'task_rejected', 'other'],
        required: true
    },
    relatedId: { type: Schema.Types.ObjectId },
    content: { type: String, required: true, maxlength: 500 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    adminNote: { type: String },
    compensation: {
        type: { type: String },
        amount: { type: Number },
        given: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
