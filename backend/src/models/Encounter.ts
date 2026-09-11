import mongoose, { Schema, Document } from 'mongoose';

export interface IEncounter extends Document {
    title: string;
    description: string;
    triggerCondition: string; // Could be a description or a coded string
    rewardContent: string;
    completionMessage?: string; // Message revealed upon completion
    completionImageUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

const EncounterSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    triggerCondition: { type: String, required: true },
    rewardContent: { type: String, required: true },
    completionMessage: { type: String },
    completionImageUrl: { type: String }
}, {
    timestamps: true
});

export default mongoose.model<IEncounter>('Encounter', EncounterSchema);
