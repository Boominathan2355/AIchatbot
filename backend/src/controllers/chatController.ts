import { Response } from 'express';
import { streamChatWithProvider, chatWithProvider, ProviderType } from '../services/providers';
import { Attachment } from '../services/providers/types';
import { DEFAULT_GEMINI_MODEL } from '../services/providers/gemini';
import { createError } from '../middleware/errorHandler';
import { Conversation } from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';
import { collectWebContext } from '../services/webService';
import { resolveAllowedPath } from '../utils/pathGuard';
import { config } from '../config/env';
import fs from 'fs/promises';

function getDefaultModel(providerType: ProviderType): string {
  switch (providerType) {
    case 'chatgpt': return 'gpt-4o-mini';
    case 'ollama': return 'llama3';
    case 'llamacpp': return 'default';
    case 'gemini':
    default: return DEFAULT_GEMINI_MODEL;
  }
}

/**
 * Explicit requests to use the local file tools. Deliberately narrow: an
 * earlier version matched the bare substrings "tool" and "get it", so
 * "which build tool should I use?" injected a fake tool-result block into
 * the prompt.
 */
const TOOL_REQUEST = /\b(use (the )?(tool|tools|mcp)|list (the )?files?|show (me )?(the )?files?|file[_ ]list|read (the )?director(y|ies)|what files)\b/i;

function wantsTool(message: string): boolean {
  return TOOL_REQUEST.test(message);
}

/**
 * Runs the file_list tool when the user explicitly asks for it, and returns a
 * context block for the model. Returns null when no tool call is warranted.
 */
async function buildToolContext(req: AuthRequest, message: string): Promise<string | null> {
  if (!wantsTool(message)) return null;

  const guard = await resolveAllowedPath(req);
  if (!guard.ok) {
    return `[MCP tool file_list was requested but is unavailable: ${guard.message} Tell the user this plainly and, if they are running the server locally, point them at Settings -> Local Access.]`;
  }

  try {
    const entries = await fs.readdir(guard.target, { withFileTypes: true });
    if (entries.length === 0) {
      return `[MCP tool file_list ran on ${guard.target} and the directory is empty. You do have tool access; tell the user the directory is empty.]`;
    }
    const list = entries
      .slice(0, 30)
      .map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
      .join('\n');
    return `[MCP tool file_list ran on ${guard.target}. You do have tool access. Result:\n${list}\n---\nPresent this as a markdown bullet list using these exact names.]`;
  } catch (err: any) {
    return `[MCP tool file_list failed on ${guard.target}: ${err.message}]`;
  }
}

async function loadHistory(conversationId?: string, userId?: string) {
  if (!conversationId || !userId) return [];
  try {
    const conv = await Conversation.findOne({ _id: conversationId, userId }).lean();
    return (conv?.messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments,
    }));
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
}

/**
 * Conversations are a single MongoDB document with a hard 16MB ceiling.
 * Attachments above the configured size are kept as metadata only, so one
 * large upload cannot make a conversation permanently unsaveable.
 */
function forStorage(attachments?: Attachment[]) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => {
    const bytes = a.base64Data ? Math.floor((a.base64Data.length * 3) / 4) : 0;
    if (bytes > config.maxStoredAttachmentBytes) {
      const { base64Data, ...meta } = a;
      return meta;
    }
    return a;
  });
}

/** Returns an error message if persistence failed, otherwise null. */
async function persistExchange(
  conversationId: string | undefined,
  userId: string | undefined,
  userContent: string,
  assistantContent: string,
  attachments?: Attachment[]
): Promise<string | null> {
  if (!conversationId || !userId) return null;

  try {
    const conversation = await Conversation.findOne({ _id: conversationId, userId });
    if (!conversation) return null;

    if (conversation.messages.filter((m: any) => m.role === 'user').length === 0) {
      conversation.title = userContent.slice(0, 80) + (userContent.length > 80 ? '...' : '');
    }

    conversation.messages.push(
      { role: 'user', content: userContent, attachments: forStorage(attachments), createdAt: new Date() } as any,
      { role: 'assistant', content: assistantContent, createdAt: new Date() } as any
    );

    await conversation.save();
    return null;
  } catch (dbError: any) {
    console.error('Failed to save conversation:', dbError);
    return dbError?.message || 'Failed to save conversation';
  }
}

async function buildEnrichedMessage(req: AuthRequest, message: string, agentMode: string): Promise<string> {
  const parts = [message];

  if (agentMode === 'web') {
    try {
      const webContext = await collectWebContext(message);
      if (webContext) parts.push(`[Realtime web context (free APIs) - cite sources]:\n${webContext}`);
    } catch (e) {
      console.error('web collect failed', e);
    }
  }

  const toolContext = await buildToolContext(req, message);
  if (toolContext) parts.push(toolContext);

  return parts.join('\n\n');
}

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
    const history = await loadHistory(conversationId, req.userId);
    const enrichedMessage = await buildEnrichedMessage(req, message, agentMode);

    const chatMessages: any[] = [
      ...history,
      { role: 'user' as const, content: enrichedMessage, attachments: attachments as Attachment[] | undefined, agentMode },
    ];
    (chatMessages as any).agentMode = agentMode;

    const providerType = provider as ProviderType;

    // The client can abort mid-stream; stop pulling from the provider then.
    let aborted = false;
    req.on('close', () => { aborted = true; });

    const stream = streamChatWithProvider({
      messages: chatMessages as any,
      model: model || getDefaultModel(providerType),
      config: { type: providerType, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined },
      providerType,
    });

    for await (const chunk of stream) {
      if (aborted) break;
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
    }

    const saveError = await persistExchange(conversationId, req.userId, message, fullResponse, attachments);

    if (aborted) { res.end(); return; }

    res.write(`data: ${JSON.stringify({ content: '', done: true, ...(saveError ? { saveError } : {}) })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to generate response', done: true })}\n\n`);
    res.end();
  }
}

export async function handleChatNonStream(req: AuthRequest, res: Response) {
  const { message, model, apiKey, attachments, agentMode = 'chat', conversationId, provider = 'gemini', baseUrl } = req.body;

  if (!message || message.trim().length === 0) {
    throw createError('Message is required', 400, 'MISSING_MESSAGE');
  }

  const history = await loadHistory(conversationId, req.userId);
  const enrichedMessage = await buildEnrichedMessage(req, message, agentMode);

  const chatMessages: any[] = [
    ...history,
    { role: 'user' as const, content: enrichedMessage, attachments: attachments as Attachment[] | undefined, agentMode },
  ];
  (chatMessages as any).agentMode = agentMode;

  const providerType = provider as ProviderType;
  const response = await chatWithProvider({
    messages: chatMessages as any,
    model: model || getDefaultModel(providerType),
    config: { type: providerType, apiKey: apiKey || undefined, baseUrl: baseUrl || undefined },
    providerType,
  });

  // The streaming path persists its exchange; this one used to drop it.
  const saveError = await persistExchange(conversationId, req.userId, message, response.content, attachments);

  res.json({ success: true, data: { content: response.content, ...(saveError ? { saveError } : {}) } });
}
