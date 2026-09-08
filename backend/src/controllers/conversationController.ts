import { Response } from 'express';
import { Conversation } from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await Conversation.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json({
      data: conversations.map((c) => ({
        id: c._id,
        title: c.title,
        agentMode: c.agentMode,
        createdAt: (c as any).createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messages?.length || 0,
        lastMessage: c.messages?.length
          ? { content: c.messages[c.messages.length - 1].content }
          : undefined,
      })),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: { message: 'Failed to fetch conversations' } });
  }
};

export const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.userId }).lean();

    if (!conversation) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }

    res.json({
      data: {
        id: conversation._id,
        title: conversation.title,
        agentMode: conversation.agentMode,
        messages: conversation.messages.map((m: any) => ({
          id: m._id?.toString() || Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          role: m.role,
          content: m.content,
          attachments: m.attachments,
          createdAt: m.createdAt,
          timestamp: m.createdAt,
        })),
        createdAt: (conversation as any).createdAt,
        updatedAt: (conversation as any).updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: { message: 'Failed to fetch conversation' } });
  }
};

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = new Conversation({
      userId: req.userId,
      title: 'New Chat',
      agentMode: req.body.agentMode || 'chat',
    });
    await conversation.save();

    res.status(201).json({
      data: {
        id: conversation._id,
        title: conversation.title,
        agentMode: conversation.agentMode,
        createdAt: (conversation as any).createdAt,
        updatedAt: (conversation as any).updatedAt,
        messageCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: { message: 'Failed to create conversation' } });
  }
};

export const updateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, messages, agentMode } = req.body;
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.userId });

    if (!conversation) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }

    if (title !== undefined) conversation.title = title;
    if (messages !== undefined) conversation.messages = messages;
    if (agentMode !== undefined) conversation.agentMode = agentMode;

    await conversation.save();

    res.json({
      data: {
        id: conversation._id,
        title: conversation.title,
        agentMode: conversation.agentMode,
      },
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: { message: 'Failed to update conversation' } });
  }
};

export const deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!conversation) {
      res.status(404).json({ error: { message: 'Conversation not found' } });
      return;
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: { message: 'Failed to delete conversation' } });
  }
};
