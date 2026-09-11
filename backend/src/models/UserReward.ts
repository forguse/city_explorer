import mongoose, { Schema, Document } from 'mongoose';

export interface IUserReward extends Document {
    user: mongoose.Types.ObjectId;
    reward: mongoose.Types.ObjectId;
    acquiredAt: Date;
}

const UserRewardSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reward: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },
    acquiredAt: { type: Date, default: Date.now }
}, {
    timestamps: false
});

// Ensure a user gets each reward only once
UserRewardSchema.index({ user: 1, reward: 1 }, { unique: true });

export default mongoose.model<IUserReward>('UserReward', UserRewardSchema);
