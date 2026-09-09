import mongoose, { Schema, Document } from 'mongoose';

export interface MemoryDocument extends Document {
  userId: string;
  nickname: string;
  occupation: string;
  moreAbout: string;
  enabled: boolean;
}

const MemorySchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    nickname: { type: String, default: '', maxlength: 100 },
    occupation: { type: String, default: '', maxlength: 200 },
    moreAbout: { type: String, default: '', maxlength: 2000 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Memory = mongoose.model<MemoryDocument>('Memory', MemorySchema);
