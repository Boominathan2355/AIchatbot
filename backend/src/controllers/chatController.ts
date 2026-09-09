import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { createHttpError } from '../middleware/errorHandler';
import { config } from '../config/environment';
import { Conversation } from '../models/conversationModel';
import { chatWithProvider, streamChatWithProvider } from '../services/providers/providerFactory';
import { Attachment, ChatMessage, ChatRequest, ProviderType, isProviderType } from '../services/providers/providerTypes';
import { resolveDefaultModel } from '../services/providers/defaultModels';
import { collectWebContext } from '../services/webService';
import { listDirectory } from '../services/fileService';
import { resolveRequestPath } from '../utils/pathGuard';
import { sendData } from '../utils/apiResponse';

interface ChatRequestBody {
  message: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  attachments?: Attachment[];
  agentMode: string;
  conversationId?: string;
  provider: ProviderType;
  personalization?: {
    nickname?: string;
    occupation?: string;
    moreAbout?: string;
    memoryEnabled?: boolean;
  };
}

const DEFAULT_PROVIDER: ProviderType = 'gemini';
const DEFAULT_AGENT_MODE = 'chat';
const TITLE_MAX_LENGTH = 80;
const FILE_LISTING_LIMIT = 30;

/**
 * Explicit requests to use the local file tools. Deliberately narrow: an
 * earlier version matched the bare substrings "tool" and "get it", so
 * "which build tool should I use?" injected a fake tool-result block into
 * the prompt.
 */
const EXPLICIT_TOOL_REQUEST = /\b(use (the )?(tool|tools|mcp)|list (the )?files?|show (me )?(the )?files?|file[_ ]list|read (the )?director(y|ies)|what files)\b/i;

function isExplicitToolRequest(message: string): boolean {
  return EXPLICIT_TOOL_REQUEST.test(message);
}

function parseChatRequestBody(body: any): ChatRequestBody {
  const message = typeof body?.message === 'string' ? body.message : '';
  if (!message.trim()) {
    throw createHttpError('Message is required', 400, 'MISSING_MESSAGE');
  }

  return {
    message,
    model: body.model || undefined,
    apiKey: body.apiKey || undefined,
    baseUrl: body.baseUrl || undefined,
    attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
    agentMode: typeof body.agentMode === 'string' ? body.agentMode : DEFAULT_AGENT_MODE,
    conversationId: body.conversationId || undefined,
    provider: isProviderType(body.provider) ? body.provider : DEFAULT_PROVIDER,
    personalization: body.personalization || undefined,
  };
}

/**
 * Runs the file_list tool when the user explicitly asks for it, and returns a
 * context block for the model. Returns null when no tool call is warranted.
 */
async function buildFileListingContext(req: AuthenticatedRequest, message: string): Promise<string | null> {
  if (!isExplicitToolRequest(message)) return null;

  const guard = await resolveRequestPath(req);
  if (!guard.ok) {
    return `[Tool file_list was requested but is unavailable: ${guard.message} Tell the user this plainly and, if they are running the server locally, point them at Settings -> Local Access.]`;
  }

  try {
    const entries = await listDirectory(guard.target, { withStats: false });
    if (entries.length === 0) {
      return `[Tool file_list ran on ${guard.target} and the directory is empty. You do have tool access; tell the user the directory is empty.]`;
    }
    const listing = entries
      .slice(0, FILE_LISTING_LIMIT)
      .map((entry) => `${entry.isDirectory ? '[DIR]' : '[FILE]'} ${entry.name}`)
      .join('\n');
    return `[Tool file_list ran on ${guard.target}. You do have tool access. Result:\n${listing}\n---\nPresent this as a markdown bullet list using these exact names.]`;
  } catch (error: any) {
    return `[Tool file_list failed on ${guard.target}: ${error.message}]`;
  }
}

async function loadConversationHistory(conversationId?: string, userId?: string): Promise<ChatMessage[]> {
  if (!conversationId || !userId) return [];

  try {
    const conversation = await Conversation.findOne({ _id: conversationId, userId }).lean();
    return (conversation?.messages || []).map((message) => ({
      role: message.role,
      content: message.content,
      attachments: message.attachments as Attachment[] | undefined,
    }));
  } catch (error) {
    console.error('[chat] failed to load history:', error);
    return [];
  }
}

/**
 * Conversations are a single MongoDB document with a hard 16MB ceiling.
 * Attachments above the configured size are kept as metadata only, so one
 * large upload cannot make a conversation permanently unsaveable.
 */
function prepareAttachmentsForStorage(attachments?: Attachment[]): Attachment[] | undefined {
  if (!attachments?.length) return undefined;

  return attachments.map((attachment) => {
    const bytes = attachment.base64Data ? Math.floor((attachment.base64Data.length * 3) / 4) : 0;
    if (bytes > config.maxStoredAttachmentBytes) {
      const { base64Data: _dropped, ...metadata } = attachment;
      return metadata;
    }
    return attachment;
  });
}

function buildConversationTitle(firstMessage: string): string {
  return firstMessage.slice(0, TITLE_MAX_LENGTH) + (firstMessage.length > TITLE_MAX_LENGTH ? '...' : '');
}

/** Appends the user/assistant pair to the conversation. Returns an error message on failure, otherwise null. */
async function persistMessageExchange(
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

    const isFirstUserMessage = !conversation.messages.some((message) => message.role === 'user');
    if (isFirstUserMessage) {
      conversation.title = buildConversationTitle(userContent);
    }

    conversation.messages.push(
      { role: 'user', content: userContent, attachments: prepareAttachmentsForStorage(attachments), createdAt: new Date() },
      { role: 'assistant', content: assistantContent, createdAt: new Date() }
    );

    await conversation.save();
    return null;
  } catch (error: any) {
    console.error('[chat] failed to save conversation:', error);
    return error?.message || 'Failed to save conversation';
  }
}

/** Adds realtime web context (web mode) and explicit tool output to the user's message. */
async function enrichUserMessage(req: AuthenticatedRequest, message: string, agentMode: string): Promise<string> {
  const sections = [message];

  if (agentMode === 'web') {
    try {
      const webContext = await collectWebContext(message);
      if (webContext) sections.push(`[Realtime web context (free APIs) - cite sources]:\n${webContext}`);
    } catch (error) {
      console.error('[chat] web context failed:', error);
    }
  }

  const toolContext = await buildFileListingContext(req, message);
  if (toolContext) sections.push(toolContext);

  return sections.join('\n\n');
}

async function buildProviderRequest(req: AuthenticatedRequest, body: ChatRequestBody): Promise<ChatRequest> {
  const history = await loadConversationHistory(body.conversationId, req.userId);
  const content = await enrichUserMessage(req, body.message, body.agentMode);

  return {
    messages: [...history, { role: 'user', content, attachments: body.attachments }],
    model: body.model || resolveDefaultModel(body.provider),
    agentMode: body.agentMode,
    providerConfig: { type: body.provider, apiKey: body.apiKey, baseUrl: body.baseUrl },
    personalization: body.personalization,
  };
}

function beginEventStream(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function writeEvent(res: Response, payload: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** POST /api/chat - streams the assistant reply as server-sent events. */
export async function streamChatCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const body = parseChatRequestBody(req.body);

  beginEventStream(res);

  let assistantContent = '';

  try {
    const providerRequest = await buildProviderRequest(req, body);

    // The client can abort mid-stream; stop pulling from the provider then.
    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    for await (const chunk of streamChatWithProvider(providerRequest)) {
      if (aborted) break;
      assistantContent += chunk;
      writeEvent(res, { content: chunk, done: false });
    }

    const saveError = await persistMessageExchange(body.conversationId, req.userId, body.message, assistantContent, body.attachments);

    if (aborted) {
      res.end();
      return;
    }

    writeEvent(res, { content: '', done: true, ...(saveError ? { saveError } : {}) });
    res.end();
  } catch (error: any) {
    console.error('[chat] stream failed:', error);
    writeEvent(res, { error: error.message || 'Failed to generate response', done: true });
    res.end();
  }
}

/** POST /api/chat/non-stream - returns the whole reply in one JSON response. */
export async function createChatCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
  const body = parseChatRequestBody(req.body);
  const providerRequest = await buildProviderRequest(req, body);

  const response = await chatWithProvider(providerRequest);
  const saveError = await persistMessageExchange(body.conversationId, req.userId, body.message, response.content, body.attachments);

  sendData(res, { content: response.content, ...(saveError ? { saveError } : {}) });
}
