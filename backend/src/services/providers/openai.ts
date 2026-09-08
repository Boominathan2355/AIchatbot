import { Provider, StreamChatOptions, ProviderResponse, ProviderType, ProviderConfig } from './types';

function getBaseUrl(type: ProviderType, customUrl?: string): string {
  if (customUrl) return customUrl;
  switch (type) {
    case 'chatgpt': return 'https://api.openai.com/v1';
    case 'ollama': return 'http://localhost:11434/v1';
    case 'llamacpp': return 'http://localhost:8080/v1';
    default: return 'https://api.openai.com/v1';
  }
}

function getApiKey(type: ProviderType, configApiKey?: string): string {
  if (configApiKey) return configApiKey;
  switch (type) {
    case 'chatgpt': return process.env.OPENAI_API_KEY || '';
    case 'ollama': return 'ollama';
    case 'llamacpp': return 'llamacpp';
    default: return '';
  }
}

function buildOpenAIMessages(messages: any[], agentMode?: string): any[] {
  const systemPrompts: Record<string, string> = {
    chat: 'You are a helpful AI assistant.',
    code: 'You are an expert programmer. Help users write, review, debug, and explain code.',
    'dev-explain': 'You are a technical explainer. Explain complex developer concepts with code examples.',
    'business-explain': 'You are a business explainer. Explain concepts in simple terms with real-world examples.',
    analyze: 'You are a document analyst. Analyze documents and extract requirements.',
    debug: 'You are a debugging expert. Help identify and fix bugs.',
    architect: 'You are a system architect. Design scalable systems.',
    write: 'You are a technical writer. Help write documentation and specs.',
    brainstorm: 'You are a creative brainstorming assistant.',
    'file-manager': 'You are a file manager assistant. Help browse and manage files.',
    'git': 'You are a Git expert. Help with git operations.',
    'web': 'You are a Web Realtime Agent using FREE APIs (Wikipedia, DuckDuckGo, Open-Meteo, HackerNews). Collect fresh data.',
  };

  const openaiMessages: any[] = [];

  const systemPrompt = systemPrompts[agentMode || 'chat'];
  if (systemPrompt) {
    openaiMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.role === 'system') {
      openaiMessages.push({ role: 'system', content: msg.content });
      continue;
    }

    if (msg.attachments && msg.attachments.length > 0) {
      const content: any[] = [];

      for (const attachment of msg.attachments) {
        if (attachment.mimeType?.startsWith('image/')) {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.base64Data}`,
            },
          });
        } else {
          content.push({
            type: 'text',
            text: `[File: ${attachment.fileName} (${attachment.fileType.toUpperCase()})]\n`,
          });
        }
      }

      content.push({ type: 'text', text: msg.content });
      openaiMessages.push({ role: msg.role, content });
    } else {
      openaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  return openaiMessages;
}

export class OpenAIProvider implements Provider {
  private type: ProviderType;

  constructor(type: ProviderType) {
    this.type = type;
  }

  async *streamChat({ messages, model, config }: StreamChatOptions): AsyncGenerator<string, void, unknown> {
    const baseUrl = getBaseUrl(this.type, config.baseUrl);
    const apiKey = getApiKey(this.type, config.apiKey);
    const agentMode = (messages as any).agentMode || 'chat';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildOpenAIMessages(messages, agentMode),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await (response.json() as Promise<any>).catch(() => ({ error: { message: response.statusText } })) as any;
      throw new Error(error.error?.message || `Provider error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async chat({ messages, model, config }: StreamChatOptions): Promise<ProviderResponse> {
    const baseUrl = getBaseUrl(this.type, config.baseUrl);
    const apiKey = getApiKey(this.type, config.apiKey);
    const agentMode = (messages as any).agentMode || 'chat';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildOpenAIMessages(messages, agentMode),
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await (response.json() as Promise<any>).catch(() => ({ error: { message: response.statusText } })) as any;
      throw new Error(error.error?.message || `Provider error: ${response.status}`);
    }

    const data = await response.json() as any;
    return { content: data.choices?.[0]?.message?.content || '' };
  }

  async listModels(config: ProviderConfig): Promise<{ id: string; name: string }[]> {
    if (this.type === 'chatgpt') {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) return [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      ];

      try {
        const baseUrl = getBaseUrl(this.type, config.baseUrl);
        const res = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!res.ok) return [];
        const data = await res.json() as any;
        return (data.data || [])
          .filter((m: any) => m.id.startsWith('gpt'))
          .map((m: any) => ({ id: m.id, name: m.id }));
      } catch {
        return [];
      }
    }

    // Ollama / llama.cpp - try to list models
    try {
      const baseUrl = getBaseUrl(this.type, config.baseUrl);
      const res = await fetch(`${baseUrl.replace('/v1', '')}/api/tags`);
      if (!res.ok) {
        return this.type === 'ollama'
          ? [{ id: 'llama3', name: 'Llama 3' }, { id: 'mistral', name: 'Mistral' }]
          : [{ id: 'default', name: 'Local Model' }];
      }
      const data = await res.json() as any;
      if (data.models) {
        return data.models.map((m: any) => ({ id: m.name, name: m.name }));
      }
    } catch {
      // server not running
    }

    return this.type === 'ollama'
      ? [{ id: 'llama3', name: 'Llama 3' }, { id: 'mistral', name: 'Mistral' }, { id: 'codellama', name: 'CodeLlama' }]
      : [{ id: 'default', name: 'Local Model' }];
  }
}
