import mongoose, { Schema, Document } from 'mongoose';

export interface IInviteCode extends Document {
    code: string;
    isUsed: boolean;
    usedBy?: mongoose.Types.ObjectId;
    usedAt?: Date;
    createdAt: Date;
}

const InviteCodeSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    isUsed: { type: Boolean, default: false },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date }
}, {
    timestamps: true
});

export default mongoose.model<IInviteCode>('InviteCode', InviteCodeSchema);
