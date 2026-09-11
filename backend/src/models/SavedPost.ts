import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedPost extends Document {
    user: mongoose.Types.ObjectId;
    post: mongoose.Types.ObjectId;
    createdAt: Date;
}

const SavedPostSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    createdAt: { type: Date, default: Date.now }
});

// Ensure a user can only save a post once
SavedPostSchema.index({ user: 1, post: 1 }, { unique: true });

// Optimize query for "My Saved Posts" (sort by time desc)
SavedPostSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<ISavedPost>('SavedPost', SavedPostSchema);
