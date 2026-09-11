
import mongoose, { Schema, Document } from 'mongoose';

export interface IProverb extends Document {
    content: string;
    imageUrl?: string;
    author: mongoose.Types.ObjectId;
    recipient?: mongoose.Types.ObjectId; // If null, it might be an open message or LBS message
    originType: 'task_completion' | 'encounter_completion' | 'lbs_discovery' | 'direct_gift';
    originId?: string; // TaskID, EncounterID, or LocationHash
    location?: {
        latitude: number;
        longitude: number;
    };
    isRead: boolean;
    isReturnGift: boolean;
    likes: number; // For "useful" or "liked" proverbs
    reports: number; // For moderation
    createdAt: Date;
    updatedAt: Date;
}

const ProverbSchema: Schema = new Schema({
    content: { type: String, required: true },
    imageUrl: { type: String },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    originType: {
        type: String,
        enum: ['task_completion', 'encounter_completion', 'lbs_discovery', 'direct_gift'],
        required: true
    },
    originId: { type: String },
    location: {
        latitude: Number,
        longitude: Number
    },
    isRead: { type: Boolean, default: false },
    isReturnGift: { type: Boolean, default: false },
    likes: { type: Number, default: 0 },
    reports: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Index for LBS discovery
ProverbSchema.index({ location: '2dsphere' });

export default mongoose.model<IProverb>('Proverb', ProverbSchema);
