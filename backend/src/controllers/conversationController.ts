import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Conversation } from '../models/conversationModel';
import { sendData, sendError } from '../utils/apiResponse';

const CONVERSATION_LIST_LIMIT = 100;
const DEFAULT_TITLE = 'New Chat';
const DEFAULT_AGENT_MODE = 'chat';

function toConversationSummary(conversation: any) {
  const messages = conversation.messages || [];
  const lastMessage = messages[messages.length - 1];
  return {
    id: conversation._id,
    title: conversation.title,
    agentMode: conversation.agentMode,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: messages.length,
    lastMessage: lastMessage ? { content: lastMessage.content } : undefined,
  };
}

function toMessageResponse(message: any) {
  return {
    id: message._id?.toString() || randomUUID(),
    role: message.role,
    content: message.content,
    attachments: message.attachments,
    createdAt: message.createdAt,
    timestamp: message.createdAt,
  };
}

function toConversationDetail(conversation: any) {
  return {
    id: conversation._id,
    title: conversation.title,
    agentMode: conversation.agentMode,
    messages: (conversation.messages || []).map(toMessageResponse),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function listConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const conversations = await Conversation.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(CONVERSATION_LIST_LIMIT)
      .lean();

    sendData(res, conversations.map(toConversationSummary));
  } catch (error) {
    console.error('[conversations] list failed:', error);
    sendError(res, 500, 'Failed to fetch conversations');
  }
}

export async function getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!conversation) {
      sendError(res, 404, 'Conversation not found');
      return;
    }
    sendData(res, toConversationDetail(conversation));
  } catch (error) {
    console.error('[conversations] get failed:', error);
    sendError(res, 500, 'Failed to fetch conversation');
  }
}

export async function createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const conversation = await new Conversation({
      userId: req.userId,
      title: DEFAULT_TITLE,
      agentMode: req.body?.agentMode || DEFAULT_AGENT_MODE,
    }).save();

    sendData(res, toConversationSummary(conversation), 201);
  } catch (error) {
    console.error('[conversations] create failed:', error);
    sendError(res, 500, 'Failed to create conversation');
  }
}

export async function updateConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, messages, agentMode } = req.body ?? {};
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.userId });
    if (!conversation) {
      sendError(res, 404, 'Conversation not found');
      return;
    }

    if (title !== undefined) conversation.title = title;
    if (messages !== undefined) conversation.messages = messages;
    if (agentMode !== undefined) conversation.agentMode = agentMode;

    await conversation.save();

    sendData(res, { id: conversation._id, title: conversation.title, agentMode: conversation.agentMode });
  } catch (error) {
    console.error('[conversations] update failed:', error);
    sendError(res, 500, 'Failed to update conversation');
  }
}

export async function deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!conversation) {
      sendError(res, 404, 'Conversation not found');
      return;
    }
    sendData(res, { id: conversation._id, deleted: true });
  } catch (error) {
    console.error('[conversations] delete failed:', error);
    sendError(res, 500, 'Failed to delete conversation');
  }
}
