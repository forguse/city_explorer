import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    sender?: mongoose.Types.ObjectId;
    type: 'like' | 'comment' | 'invite' | 'friend_request' | 'task_invite' |
          'task_approved' | 'task_rejected' | 'task_removed' | 'task_milestone' |
          'post_approved' | 'post_rejected' | 'post_removed' |
          'report_approved' | 'report_rejected' |
          'self_task_completed' | 'friend_accepted' | 'system'; // Keep 'system' for backward compatibility
    referenceId?: mongoose.Types.ObjectId; // ID of Post, Club, etc.
    content?: string; // For comments or system messages
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: [
        'like', 'comment', 'invite', 'friend_request', 'task_invite',
        'task_approved', 'task_rejected', 'task_removed', 'task_milestone',
        'post_approved', 'post_rejected', 'post_removed',
        'report_approved', 'report_rejected',
        'self_task_completed', 'friend_accepted', 'system' // Keep 'system' for backward compatibility
    ], required: true },
    referenceId: { type: Schema.Types.ObjectId },
    content: { type: String },
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
