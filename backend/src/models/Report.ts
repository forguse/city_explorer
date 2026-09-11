import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
    reporter: mongoose.Types.ObjectId;
    targetType: 'task' | 'post';
    targetId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    processedBy?: mongoose.Types.ObjectId;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema: Schema = new Schema({
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['task', 'post'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: 'targetType' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNote: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date }
}, {
    timestamps: true
});

// 索引：用于查询用户当天的举报次数
ReportSchema.index({ reporter: 1, createdAt: -1 });
// 索引：用于查询待处理的举报
ReportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IReport>('Report', ReportSchema);
