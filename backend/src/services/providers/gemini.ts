import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider, StreamChatOptions, ProviderResponse, ProviderConfig } from './types';
import { AgentMode } from '../../types/gemini';

function getSystemPrompt(agentMode: string): string {
  const prompts: Record<string, string> = {
    chat: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
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

export class GeminiProvider implements Provider {
  async *streamChat({ messages, model, config }: StreamChatOptions): AsyncGenerator<string, void, unknown> {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is required');

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const agentMode = (messages as any).agentMode || 'chat';
    const contents = buildContents(messages, agentMode);

    const result = await geminiModel.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  async chat({ messages, model, config }: StreamChatOptions): Promise<ProviderResponse> {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is required');

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    const agentMode = (messages as any).agentMode || 'chat';
    const contents = buildContents(messages, agentMode);

    const result = await geminiModel.generateContent({ contents });
    return { content: result.response.text() };
  }

  async listModels(config: ProviderConfig): Promise<{ id: string; name: string }[]> {
    const base = [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
      { id: 'gemini-nano', name: 'Gemini Nano' },
    ];
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) return base;
    return base;
  }
}
