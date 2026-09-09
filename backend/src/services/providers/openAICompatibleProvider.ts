import { ChatMessage, ChatRequest, ChatResponse, ModelSummary, Provider, ProviderConfig, ProviderType } from './providerTypes';
import { FALLBACK_MODELS } from './defaultModels';
import { getSystemPrompt } from '../../prompts/systemPrompts';
import { config } from '../../config/environment';

/** Providers that speak the OpenAI chat-completions wire format. */
export type OpenAICompatibleProviderType = Exclude<ProviderType, 'gemini'>;

const DEFAULT_BASE_URLS: Record<OpenAICompatibleProviderType, string> = {
  chatgpt: 'https://api.openai.com/v1',
  ollama: 'http://localhost:11434/v1',
  llamacpp: 'http://localhost:8080/v1',
};

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
}

function resolveBaseUrl(type: OpenAICompatibleProviderType, customUrl?: string): string {
  return customUrl || DEFAULT_BASE_URLS[type];
}

function resolveApiKey(type: OpenAICompatibleProviderType, configuredApiKey?: string): string {
  if (configuredApiKey) return configuredApiKey;
  // Local servers ignore the key but still expect the Authorization header.
  return type === 'chatgpt' ? config.openaiApiKey : type;
}

function toOpenAIContent(message: ChatMessage): string | OpenAIContentPart[] {
  if (!message.attachments?.length) return message.content;

  const parts: OpenAIContentPart[] = [];
  for (const attachment of message.attachments) {
    if (attachment.mimeType?.startsWith('image/') && attachment.base64Data) {
      parts.push({ type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${attachment.base64Data}` } });
    } else {
      parts.push({ type: 'text', text: `[File: ${attachment.fileName} (${attachment.fileType.toUpperCase()})]\n` });
    }
  }
  parts.push({ type: 'text', text: message.content });
  return parts;
}

function toOpenAIMessages(messages: ChatMessage[], systemPrompt: string): OpenAIMessage[] {
  const openAIMessages: OpenAIMessage[] = [{ role: 'system', content: systemPrompt }];

  for (const message of messages) {
    if (message.role === 'system') {
      openAIMessages.push({ role: 'system', content: message.content });
      continue;
    }
    openAIMessages.push({ role: message.role, content: toOpenAIContent(message) });
  }

  return openAIMessages;
}

async function requestChatCompletion(baseUrl: string, apiKey: string, body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload: any = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || response.statusText || `Provider error: ${response.status}`);
  }

  return response;
}

/** Yields the `delta.content` of each server-sent event in a streaming completion. */
async function* readStreamedContent(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
  const reader = body.getReader();
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
      if (!trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice('data: '.length);
      if (data === '[DONE]') return;

      try {
        const content = JSON.parse(data).choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip malformed lines.
      }
    }
  }
}

export class OpenAICompatibleProvider implements Provider {
  constructor(private readonly type: OpenAICompatibleProviderType) {}

  async *streamChat({ messages, model, agentMode, providerConfig, personalization }: ChatRequest): AsyncGenerator<string, void, unknown> {
    const response = await requestChatCompletion(
      resolveBaseUrl(this.type, providerConfig.baseUrl),
      resolveApiKey(this.type, providerConfig.apiKey),
      { model, messages: toOpenAIMessages(messages, getSystemPrompt(agentMode, personalization)), stream: true }
    );

    if (!response.body) throw new Error('Provider returned an empty stream');
    yield* readStreamedContent(response.body);
  }

  async chat({ messages, model, agentMode, providerConfig, personalization }: ChatRequest): Promise<ChatResponse> {
    const response = await requestChatCompletion(
      resolveBaseUrl(this.type, providerConfig.baseUrl),
      resolveApiKey(this.type, providerConfig.apiKey),
      { model, messages: toOpenAIMessages(messages, getSystemPrompt(agentMode, personalization)), stream: false }
    );

    const payload: any = await response.json();
    return { content: payload.choices?.[0]?.message?.content || '' };
  }

  async listModels(providerConfig: ProviderConfig): Promise<ModelSummary[]> {
    return this.type === 'chatgpt' ? this.listOpenAIModels(providerConfig) : this.listLocalModels(providerConfig);
  }

  private async listOpenAIModels(providerConfig: ProviderConfig): Promise<ModelSummary[]> {
    const apiKey = providerConfig.apiKey || config.openaiApiKey;
    if (!apiKey) return FALLBACK_MODELS.chatgpt;

    try {
      const response = await fetch(`${resolveBaseUrl(this.type, providerConfig.baseUrl)}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) return [];

      const payload: any = await response.json();
      return (payload.data || [])
        .filter((model: any) => typeof model.id === 'string' && model.id.startsWith('gpt'))
        .map((model: any) => ({ id: model.id, name: model.id }));
    } catch {
      return [];
    }
  }

  /** Ollama and llama.cpp expose their catalogue on `/api/tags`, outside the `/v1` prefix. */
  private async listLocalModels(providerConfig: ProviderConfig): Promise<ModelSummary[]> {
    const fallback = FALLBACK_MODELS[this.type];

    try {
      const baseUrl = resolveBaseUrl(this.type, providerConfig.baseUrl).replace('/v1', '');
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) return fallback;

      const payload: any = await response.json();
      if (Array.isArray(payload.models)) {
        return payload.models.map((model: any) => ({ id: model.name, name: model.name }));
      }
    } catch {
      // Local server not running.
    }

    return fallback;
  }
}
