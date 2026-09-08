import mongoose, { Schema, Document } from 'mongoose';

export interface StoredAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  /** Absent for attachments above the configured storage cap. */
  base64Data?: string;
  mimeType: string;
  preview?: string;
}

export type MessageRole = 'user' | 'assistant';

export interface StoredMessage {
  role: MessageRole;
  content: string;
  attachments?: StoredAttachment[];
  createdAt: Date;
}

export interface ConversationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: StoredMessage[];
  agentMode: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    // Optional: large attachments are stored as metadata only so a
    // conversation cannot exceed MongoDB's 16MB document limit.
    base64Data: { type: String },
    mimeType: { type: String, required: true },
    preview: { type: String },
  },
  { _id: false }
);

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  attachments: [AttachmentSchema],
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat' },
    messages: [MessageSchema],
    agentMode: { type: String, default: 'chat' },
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation = mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
