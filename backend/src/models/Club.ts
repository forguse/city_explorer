import mongoose, { Schema, Document } from 'mongoose';

export interface IClub extends Document {
    name: string;
    coverUrl?: string;
    description: string;
    city: string;
    president: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    activityTasks: mongoose.Types.ObjectId[];
    announcement?: string;           // 社团公告
    announcementUpdatedAt?: Date;    // 公告更新时间
    status: 'pending' | 'approved' | 'rejected';  // 审核状态
    createdAt: Date;
    updatedAt: Date;
}

const ClubSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true, maxlength: 20 },
    coverUrl: { type: String },
    description: { type: String, maxlength: 200 },
    city: { type: String, required: true },
    president: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    activityTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    announcement: { type: String, default: '', maxlength: 500 },
    announcementUpdatedAt: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, {
    timestamps: true
});

export default mongoose.model<IClub>('Club', ClubSchema);
