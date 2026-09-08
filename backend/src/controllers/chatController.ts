import { Response } from 'express';
import { streamChatWithProvider, ProviderType } from '../services/providers';
import { Attachment } from '../services/providers/types';
import { createError } from '../middleware/errorHandler';
import { Conversation } from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';

export async function handleChat(req: AuthRequest, res: Response) {
  const { message, model, apiKey, attachments, agentMode = 'chat', conversationId, provider = 'gemini', baseUrl } = req.body;

  if (!message || message.trim().length === 0) {
    throw createError('Message is required', 400, 'MISSING_MESSAGE');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullResponse = '';

  try {
    // --- Conversation memory: load previous messages ---
    let history: any[] = [];
    if (conversationId && req.userId) {
      try {
        const conv = await Conversation.findOne({ _id: conversationId, userId: req.userId }).lean();
        if (conv?.messages) {
          history = conv.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          }));
        }
      } catch (e) { console.error('Failed to load history:', e); }
    }

    const chatMessages: any[] = [
      ...history,
      {
        role: 'user' as const,
        content: message,
        attachments: attachments as Attachment[] | undefined,
        agentMode,
      },
    ];
    (chatMessages as any).agentMode = agentMode;

    const providerType = provider as ProviderType;

    const stream = streamChatWithProvider({
      messages: chatMessages as any,
      model: model || getDefaultModel(providerType),
      config: {
        type: providerType,
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
      },
      providerType,
    });

    for await (const chunk of stream) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
    }

    // Save to MongoDB
    try {
      const convId = conversationId;
      if (convId && req.userId) {
        const conversation = await Conversation.findOne({ _id: convId, userId: req.userId });
        if (conversation) {
          if (conversation.messages.filter((m: any) => m.role === 'user').length === 0) {
            conversation.title = message.slice(0, 80) + (message.length > 80 ? '...' : '');
          }

          conversation.messages.push(
            {
              role: 'user',
              content: message,
              attachments: attachments as any,
              createdAt: new Date(),
            } as any,
            {
              role: 'assistant',
              content: fullResponse,
              createdAt: new Date(),
            } as any
          );

          await conversation.save();
        }
      }
    } catch (dbError) {
      console.error('Failed to save to MongoDB:', dbError);
    }

    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    const errorMessage = error.message || 'Failed to generate response';
    res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
    res.end();
  }
}

function getDefaultModel(providerType: ProviderType): string {
  switch (providerType) {
    case 'chatgpt': return 'gpt-4o-mini';
    case 'ollama': return 'llama3';
    case 'llamacpp': return 'default';
    case 'gemini':
    default: return 'gemini-3.8-flash';
  }
}

export async function handleChatNonStream(req: AuthRequest, res: Response) {
  const { message, model, apiKey, attachments, agentMode = 'chat', provider = 'gemini', baseUrl } = req.body;

  if (!message || message.trim().length === 0) {
    throw createError('Message is required', 400, 'MISSING_MESSAGE');
  }

  const { chatWithProvider } = await import('../services/providers');

  let historyNs: any[] = [];
  if ((req as any).body?.conversationId && (req as AuthRequest).userId) {
    try {
      const convNs = await Conversation.findOne({ _id: (req as any).body.conversationId, userId: (req as AuthRequest).userId }).lean();
      if (convNs?.messages) historyNs = convNs.messages.map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments }));
    } catch {}
  }
  const chatMessagesNs: any[] = [...historyNs, { role: 'user' as const, content: message, attachments: attachments as Attachment[] | undefined, agentMode }];
  (chatMessagesNs as any).agentMode = agentMode;

  const providerType = provider as ProviderType;
  const response = await chatWithProvider({
    messages: chatMessagesNs as any,
    model: model || getDefaultModel(providerType),
    config: {
      type: providerType,
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
    },
    providerType,
  });

  res.json({ success: true, data: { content: response.content } });
}
