import { Response } from 'express';
import { streamChatWithProvider, ProviderType } from '../services/providers';
import { Attachment } from '../services/providers/types';
import { createError } from '../middleware/errorHandler';
import { Conversation } from '../models/Conversation';
import { AuthRequest } from '../middleware/auth';
import { collectWebContext } from '../services/webService';

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

    // Web agent realtime fetch (free APIs, no paid search)
    let webContext: string | null = null;
    if (agentMode === 'web') {
      try { webContext = await collectWebContext(message); } catch (e) { console.error('web collect failed', e); }
    }

    // Tool context: if user says "use tool" and Local Access enabled, actually call file_list
    let toolContext: string | null = null;
    const allowedBaseHeader = (req.headers['x-allowed-path'] as string) || (req.body as any).allowedPath;
    const lower = message.toLowerCase();
    const wantsTool = lower.includes('use tool') || lower.includes('get it') || lower.includes('list file') || lower.includes('show file') || lower.includes('tool') || lower.includes('use mcp') || lower.includes('mcp');
    if (wantsTool && allowedBaseHeader) {
      try {
        const isWindowsPath = /^[A-Z]:\\/i.test(allowedBaseHeader) || allowedBaseHeader.includes(':\\');
        if (isWindowsPath) {
          toolContext = `[MCP Tool note: User's allowedPath "${allowedBaseHeader}" is a Windows path on their local machine (C: drive). This cloud server runs Linux and cannot directly access the user's C: drive due to security isolation. You DO have tool access for server paths, but for user's Desktop, instruct them to either: 1) Run locally (npm run dev) with allowedPath set to their Desktop, or 2) Use the browser File Picker in the UI, or 3) Copy file list via PowerShell: Get-ChildItem "C:\\Users\\BN\\Desktop" | Select-Object Name. Do NOT output [object Object] - output a helpful explanation and the PowerShell command in a powershell code block. Never claim isolated without offering this path.]`;
        } else {
          const fs = await import('fs/promises');
          const path = await import('path');
          const target = path.resolve(allowedBaseHeader);
          const entries = await fs.readdir(target, { withFileTypes: true }).catch(() => []);
          if (entries.length > 0) {
            const list = entries.slice(0, 30).map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
            toolContext = `[MCP Tool file_list executed on ${target} - you DO have tool access. Files:\n${list}\n---\nIMPORTANT: Output this list as a markdown bullet list with exact file names, NOT as JSON with [object Object]. Do NOT output [object Object]. Use the list above verbatim.]`;
          } else {
            toolContext = `[MCP Tool file_list on ${target}: empty or not found. You DO have tool access. Tell user the directory is empty or path not found on server.]`;
          }
        }
      } catch (e: any) { toolContext = `[Tool error: ${e.message}]`; }
    } else if (wantsTool && !allowedBaseHeader) {
      toolContext = `[User asked to use tool but allowedPath not set. Tell them to set Allowed Path in Settings → Local Access and enable File Manager. Example: /tmp or C:\\Users\\You\\Desktop (for local dev only).]`;
    }

    const parts = [message];
    if (webContext) parts.push(`[Realtime Web Context (free APIs) - cite sources]:\n${webContext}`);
    if (toolContext) parts.push(toolContext);
    const enrichedMessage = parts.join('\n\n');

    const chatMessages: any[] = [
      ...history,
      {
        role: 'user' as const,
        content: enrichedMessage,
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
  let webContextNs: string | null = null;
  if (agentMode === 'web') { try { webContextNs = await collectWebContext(message); } catch {} }
  let toolContextNs: string | null = null;
  const allowedBaseNs = (req.headers['x-allowed-path'] as string) || (req.body as any).allowedPath;
  const lowerNs = message.toLowerCase();
  const wantsToolNs = lowerNs.includes('use tool') || lowerNs.includes('get it') || lowerNs.includes('list file') || lowerNs.includes('show file') || lowerNs.includes('tool') || lowerNs.includes('use mcp') || lowerNs.includes('mcp');
  if (wantsToolNs && allowedBaseNs) {
    try {
      const isWinNs = /^[A-Z]:\\/i.test(allowedBaseNs) || allowedBaseNs.includes(':\\');
      if (isWinNs) {
        toolContextNs = `[MCP Tool note: Windows path "${allowedBaseNs}" is on user's local machine, not accessible from Linux cloud server. Instruct to run locally or use File Picker. Do NOT output [object Object].]`;
      } else {
        const fsNs = await import('fs/promises');
        const pathNs = await import('path');
        const targetNs = pathNs.resolve(allowedBaseNs);
        const entriesNs = await fsNs.readdir(targetNs, { withFileTypes: true }).catch(() => []);
        if (entriesNs.length > 0) {
          const listNs = entriesNs.slice(0, 30).map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
          toolContextNs = `[MCP Tool file_list executed on ${targetNs}]:\n${listNs}\n[IMPORTANT: Output as markdown bullet list, NOT as JSON with [object Object].]`;
        } else toolContextNs = `[MCP Tool file_list on ${targetNs}: empty]`;
      }
    } catch (e: any) { toolContextNs = `[Tool error: ${e.message}]`; }
  } else if (wantsToolNs && !allowedBaseNs) {
    toolContextNs = `[User asked to use tool but allowedPath not set. Tell them to set Allowed Path in Settings.]`;
  }
  const partsNs = [message];
  if (webContextNs) partsNs.push(`[Realtime Web Context]:\n${webContextNs}`);
  if (toolContextNs) partsNs.push(toolContextNs);
  const enrichedNs = partsNs.join('\n\n');
  const chatMessagesNs: any[] = [...historyNs, { role: 'user' as const, content: enrichedNs, attachments: attachments as Attachment[] | undefined, agentMode }];
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
