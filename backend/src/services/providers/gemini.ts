import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider, StreamChatOptions, ProviderResponse, ProviderConfig } from './types';

function getSystemPrompt(agentMode: string): string {
  const prompts: Record<string, string> = {
    chat: 'You are a helpful AI assistant. When Local Access is enabled (File Manager/Git with allowedPath), you DO have access to local filesystem and git via MCP tools (/api/files, /api/git) and free web APIs. When user says "use tool and get it" or asks to list files, assume tools are available and help - never claim you are isolated.',
    code: 'You are an expert programmer. Help users write, review, debug, and explain code in any programming language. Always provide code examples when relevant.',
    'dev-explain': 'You are a technical explainer. Explain complex developer concepts in detail with code examples, architecture diagrams, and practical implementation guidance.',
    'business-explain': 'You are a business explainer. Explain complex business concepts in simple terms with real-world examples and actionable insights.',
    analyze: 'You are a document analyst. Analyze uploaded documents, extract requirements, identify key points, and provide structured analysis.',
    debug: 'You are a debugging expert. Help identify and fix bugs in code. Ask clarifying questions, provide step-by-step debugging approaches, and suggest permanent fixes.',
    architect: 'You are a system architect. Design scalable, maintainable systems. Provide architecture diagrams, technology recommendations, and best practices.',
    write: 'You are a technical writer. Help write documentation, READMEs, API docs, and technical specifications. Use clear, professional language.',
    brainstorm: 'You are a creative brainstorming assistant. Generate innovative ideas, explore different perspectives, and help users think outside the box.',
    'file-manager': 'You are a file manager assistant. Help browse, read, write and organize files within the allowed path.',
    'git': 'You are a Git expert. Help with git status, add, commit, log operations within the allowed path.',
    'web': 'You are a Web Realtime Agent using FREE APIs (Wikipedia, DuckDuckGo, Open-Meteo, HackerNews). Collect fresh data and cite sources.',
  };
  return prompts[agentMode] || prompts.chat;
}

function buildContents(messages: any[], agentMode: string) {
  const systemPrompt = getSystemPrompt(agentMode);
  const contents: any[] = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'I understand. I will follow these instructions.' }] });
  }

  for (const msg of messages) {
    const parts: any[] = [];

    if (msg.attachments && msg.attachments.length > 0) {
      for (const attachment of msg.attachments) {
        if (attachment.mimeType?.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64Data,
            },
          });
        } else {
          parts.push({
            text: `[File: ${attachment.fileName} (${attachment.fileType.toUpperCase()})]\n`,
          });
        }
      }
    }

    parts.push({ text: msg.content });

    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts,
    });
  }

  return contents;
}

/**
 * Model ids published by the Gemini API. Earlier releases of this file used
 * invented ids (gemini-3.8-flash and friends) which 404 on every request and
 * silently burned a round trip before the fallback chain took over.
 */
export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, best for most tasks' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning and analysis' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Lowest latency and cost' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation' },
];

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/** Ids retired or never real, mapped onto a current equivalent. */
const MODEL_ALIASES: Record<string, string> = {
  'gemini-nano': 'gemini-2.5-flash-lite',
  'gemini-3.8-flash': 'gemini-2.5-flash',
  'gemini-3.5-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-1.5-flash-8b': 'gemini-2.5-flash-lite',
};

function mapModel(id: string): string {
  return MODEL_ALIASES[id] || id;
}

function fallbackChain(primary: string): string[] {
  const chain = [mapModel(primary)];
  // Retried only on 503 / overload, in descending capability order.
  for (const f of ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']) {
    if (!chain.includes(f)) chain.push(f);
  }
  return chain;
}

export class GeminiProvider implements Provider {
  async *streamChat({ messages, model, config }: StreamChatOptions): AsyncGenerator<string, void, unknown> {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is required');

    const agentMode = (messages as any).agentMode || 'chat';
    const contents = buildContents(messages, agentMode);
    const chain = fallbackChain(model);

    let lastErr: any = null;
    for (const m of chain) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: m });
        const result = await geminiModel.generateContentStream({ contents });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) yield text;
        }
        return;
      } catch (err: any) {
        lastErr = err;
        const msg = err.message || '';
        const isRetryable = err.status === 503 || err.status === 429 || msg.includes('503') || msg.includes('429') || msg.includes('high demand') || msg.includes('quota') || msg.includes('Too Many Requests');
        // For 429 quota, don't fallback infinitely - surface friendly error after first fallback attempt
        const isQuota = err.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
        if (isQuota) {
          throw new Error(`QUOTA_EXCEEDED: You exceeded your current quota (model ${m} 429). Please check your plan/billing at https://ai.google.dev/gemini-api/docs/billing, or try again later / switch to Ollama/ChatGPT. Original: ${msg}`);
        }
        if (!isRetryable || m === chain[chain.length - 1]) throw err;
        console.warn(`Model ${m} failed ${err.status || ''}, trying fallback ${chain[chain.indexOf(m)+1]}`);
      }
    }
    throw lastErr;
  }

  async chat({ messages, model, config }: StreamChatOptions): Promise<ProviderResponse> {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is required');

    const agentMode = (messages as any).agentMode || 'chat';
    const contents = buildContents(messages, agentMode);
    const chain = fallbackChain(model);

    let lastErr: any = null;
    for (const m of chain) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: m });
        const result = await geminiModel.generateContent({ contents });
        return { content: result.response.text() };
      } catch (err: any) {
        lastErr = err;
        const msg = err.message || '';
        const isRetryable = err.status === 503 || msg.includes('503') || msg.includes('high demand');
        const isQuota = err.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
        if (isQuota) {
          throw new Error(`QUOTA_EXCEEDED: You exceeded your current quota (model ${m} 429). Please check your plan/billing, or try again later / switch provider. Original: ${msg}`);
        }
        if (!isRetryable || m === chain[chain.length - 1]) throw err;
        console.warn(`Model ${m} failed, fallback ${chain[chain.indexOf(m)+1]}`);
      }
    }
    throw lastErr;
  }

  async listModels(_config: ProviderConfig): Promise<{ id: string; name: string }[]> {
    return GEMINI_MODELS.map(({ id, name }) => ({ id, name }));
  }
}
