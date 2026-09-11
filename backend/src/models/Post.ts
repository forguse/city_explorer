import mongoose, { Schema, Document } from 'mongoose';

export interface IComment {
    user: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
    parentComment?: mongoose.Types.ObjectId;  // 父评论ID（如果是回复）
    replyTo?: {  // 被回复的用户信息
        userId: mongoose.Types.ObjectId;
        username: string;
    };
    likes?: mongoose.Types.ObjectId[];  // 点赞用户列表
}

export interface IPost extends Document {
    content: string;
    imageUrls: string[];
    relatedTask?: mongoose.Types.ObjectId;
    remixTask?: mongoose.Types.ObjectId;
    relatedSerendipity?: mongoose.Types.ObjectId;  // 关联的已完成奇遇 (UserEncounter ID)
    author: mongoose.Types.ObjectId;
    likes: mongoose.Types.ObjectId[];
    comments: IComment[];
    reportedBy: mongoose.Types.ObjectId[]; // 举报用户列表
    reportCount: number; // 举报次数
    saveCount?: number; // 收藏次数 (Optional for backward compatibility)
    status: 'pending' | 'approved' | 'rejected'; // 审核状态
    reviewedBy?: mongoose.Types.ObjectId; // 审核人
    reviewedAt?: Date; // 审核时间
    deletedBy?: mongoose.Types.ObjectId; // 删除者（管理员）
    deletedAt?: Date; // 删除时间
    deleteReason?: string; // 删除原因
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 100 },
    createdAt: { type: Date, default: Date.now },
    parentComment: { type: Schema.Types.ObjectId },  // 父评论ID
    replyTo: {  // 被回复的用户信息
        userId: { type: Schema.Types.ObjectId },
        username: { type: String }
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }]  // 点赞用户列表
}, { _id: true });

const PostSchema: Schema = new Schema({
    content: { type: String, required: true, maxlength: 500 },
    imageUrls: [{ type: String }],
    relatedTask: { type: Schema.Types.ObjectId, ref: 'Task' },
    remixTask: { type: Schema.Types.ObjectId, ref: 'Task' },
    relatedSerendipity: { type: Schema.Types.ObjectId, ref: 'UserEncounter' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reportCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    deleteReason: { type: String }
}, {
    timestamps: true
});

export default mongoose.model<IPost>('Post', PostSchema);
