import mongoose, { Schema, Document } from 'mongoose';

export interface IClubJoinRequest extends Document {
    club: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    message?: string;  // 申请留言
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: mongoose.Types.ObjectId;  // 审核人（团长）
    reviewedAt?: Date;
    rejectReason?: string;  // 拒绝原因
    createdAt: Date;
    updatedAt: Date;
}

const ClubJoinRequestSchema: Schema = new Schema({
    club: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectReason: { type: String }
}, {
    timestamps: true
});

// 复合索引：一个用户对一个社团只能有一个待处理的申请
ClubJoinRequestSchema.index({ club: 1, user: 1, status: 1 });

export default mongoose.model<IClubJoinRequest>('ClubJoinRequest', ClubJoinRequestSchema);
