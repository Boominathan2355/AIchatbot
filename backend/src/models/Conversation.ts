import mongoose, { Schema, Document } from 'mongoose';

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  base64Data: string;
  mimeType: string;
  preview?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: MessageAttachment[];
  createdAt: Date;
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: ChatMessage[];
  agentMode: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  attachments: [{
    id: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    base64Data: { type: String, required: true },
    mimeType: { type: String, required: true },
    preview: { type: String },
  }],
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Chat' },
    messages: [MessageSchema],
    agentMode: { type: String, default: 'chat' },
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
