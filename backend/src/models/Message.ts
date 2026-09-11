import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    receiver?: mongoose.Types.ObjectId; // For direct messages
    groupId?: mongoose.Types.ObjectId; // For group messages (e.g., Club chat)
    content: string;
    type: 'text' | 'image';
    createdAt: Date;
}

const MessageSchema: Schema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: Schema.Types.ObjectId }, // Can ref Club or a distinct ChatGroup model
    content: { type: String, required: true, maxlength: 1000 },
    type: { type: String, enum: ['text', 'image'], default: 'text' }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model<IMessage>('Message', MessageSchema);
