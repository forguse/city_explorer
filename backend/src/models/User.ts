import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string; // Added field
    passwordHash: string;
    avatarUrl?: string;
    bio?: string;
    coverUrl?: string;  // 用户背景图
    level: number;
    experience: number;
    points: number;
    isAdmin: boolean;
    following: mongoose.Types.ObjectId[];
    followers: mongoose.Types.ObjectId[];
    savedTasks: mongoose.Types.ObjectId[];
    joinedClubs: mongoose.Types.ObjectId[];
    friends: mongoose.Types.ObjectId[];
    showcaseTasks: mongoose.Types.ObjectId[];  // 用户展示的任务执行记录（最多9个）
    // 每日举报限制
    dailyReportCount: number;
    lastReportDate?: Date;
    preferences?: {
        location: boolean;
        notifications: boolean;
        randomEncounter: boolean;
        highContrast: boolean;
        haptics: boolean;
        notificationSettings?: {
            like: boolean;
            comment: boolean;
            invite: boolean;
            friend_request: boolean;
            task_invite: boolean;
            task_approved: boolean;
            task_rejected: boolean;
            task_removed: boolean;
            task_milestone: boolean;
            post_approved: boolean;
            post_rejected: boolean;
            post_removed: boolean;
            report_approved: boolean;
            report_rejected: boolean;
            self_task_completed: boolean;
            friend_accepted: boolean;
            system: boolean; // Keep for backward compatibility
        };
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, maxlength: 18 },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    coverUrl: { type: String },  // 用户背景图
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    // 每日举报限制
    dailyReportCount: { type: Number, default: 0 },
    lastReportDate: { type: Date },
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    savedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    joinedClubs: [{ type: Schema.Types.ObjectId, ref: 'Club' }],
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    showcaseTasks: [{ type: Schema.Types.ObjectId, ref: 'TaskExecution' }],  // 用户展示的任务执行记录（最多9个）
    bio: { type: String, default: '', maxlength: 30 },
    preferences: {
        location: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true },
        randomEncounter: { type: Boolean, default: true },
        highContrast: { type: Boolean, default: false },
        haptics: { type: Boolean, default: true },
        notificationSettings: {
            like: { type: Boolean, default: true },
            comment: { type: Boolean, default: true },
            invite: { type: Boolean, default: true },
            friend_request: { type: Boolean, default: true },
            task_invite: { type: Boolean, default: true },
            task_approved: { type: Boolean, default: true },
            task_rejected: { type: Boolean, default: true },
            task_removed: { type: Boolean, default: true },
            task_milestone: { type: Boolean, default: true },
            post_approved: { type: Boolean, default: true },
            post_rejected: { type: Boolean, default: true },
            post_removed: { type: Boolean, default: true },
            report_approved: { type: Boolean, default: true },
            report_rejected: { type: Boolean, default: true },
            self_task_completed: { type: Boolean, default: true },
            friend_accepted: { type: Boolean, default: true },
            system: { type: Boolean, default: true } // Keep for backward compatibility
        }
    }
}, {
    timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
