import mongoose, { Schema, Document } from 'mongoose';

export interface IReward extends Document {
    title: string;
    medal: string;
    rarity: number; // 1-5
    image: string;
    description?: string;
    condition?: string;
    type: 'badge' | 'album'; // New field
    location?: string; // For albums
    createdAt: Date;
}

const RewardSchema: Schema = new Schema({
    title: { type: String, required: true },
    medal: { type: String, required: true },
    rarity: { type: Number, default: 1 },
    image: { type: String, required: true },
    description: { type: String },
    condition: { type: String },
    type: { type: String, enum: ['badge', 'album'], default: 'badge' },
    location: { type: String } // For albums, e.g., "成都中心"
}, {
    timestamps: true
});

export default mongoose.model<IReward>('Reward', RewardSchema);
