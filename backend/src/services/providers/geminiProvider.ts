import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import { ChatMessage, ChatRequest, ChatResponse, ModelSummary, Provider, ProviderConfig } from './providerTypes';
import { getSystemPrompt } from '../../prompts/systemPrompts';
import { config } from '../../config/environment';

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

/** Tried in order after the requested model, only on overload responses. */
const FALLBACK_SEQUENCE = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

const SYSTEM_PROMPT_ACKNOWLEDGEMENT = 'I understand. I will follow these instructions.';

type FailureKind = 'quota' | 'retryable' | 'fatal';

function resolveModelAlias(modelId: string): string {
  return MODEL_ALIASES[modelId] || modelId;
}

function buildFallbackChain(primaryModel: string): string[] {
  const chain = [resolveModelAlias(primaryModel)];
  for (const modelId of FALLBACK_SEQUENCE) {
    if (!chain.includes(modelId)) chain.push(modelId);
  }
  return chain;
}

function resolveApiKey(providerConfig: ProviderConfig): string {
  const apiKey = providerConfig.apiKey || config.geminiApiKey;
  if (!apiKey) throw new Error('Gemini API key is required');
  return apiKey;
}

function toGeminiParts(message: ChatMessage): Part[] {
  const parts: Part[] = [];

  for (const attachment of message.attachments ?? []) {
    if (attachment.mimeType?.startsWith('image/') && attachment.base64Data) {
      parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.base64Data } });
    } else {
      parts.push({ text: `[File: ${attachment.fileName} (${attachment.fileType.toUpperCase()})]\n` });
    }
  }

  parts.push({ text: message.content });
  return parts;
}

/**
 * Gemini has no system role in this SDK version; the shared prompt is sent as
 * an opening user/model exchange that the conversation then continues.
 */
function toGeminiContents(messages: ChatMessage[], systemPrompt: string): Content[] {
  const contents: Content[] = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: SYSTEM_PROMPT_ACKNOWLEDGEMENT }] },
  ];

  for (const message of messages) {
    contents.push({ role: message.role === 'user' ? 'user' : 'model', parts: toGeminiParts(message) });
  }

  return contents;
}

function classifyFailure(error: any): FailureKind {
  const status = error?.status;
  const message: string = error?.message || '';

  if (status === 429 || message.includes('429') || message.includes('quota') || message.includes('Too Many Requests')) {
    return 'quota';
  }
  if (status === 503 || message.includes('503') || message.includes('high demand')) {
    return 'retryable';
  }
  return 'fatal';
}

/** The `QUOTA_EXCEEDED:` prefix is recognised by the frontend to render billing guidance. */
function createQuotaExceededError(modelId: string, originalMessage: string): Error {
  return new Error(
    `QUOTA_EXCEEDED: You exceeded your current quota (model ${modelId} 429). ` +
      'Please check your plan/billing at https://ai.google.dev/gemini-api/docs/billing, ' +
      `or try again later / switch to Ollama/ChatGPT. Original: ${originalMessage}`
  );
}

export class GeminiProvider implements Provider {
  async *streamChat({ messages, model, agentMode, providerConfig }: ChatRequest): AsyncGenerator<string, void, unknown> {
    const client = new GoogleGenerativeAI(resolveApiKey(providerConfig));
    const contents = toGeminiContents(messages, getSystemPrompt(agentMode));
    const chain = buildFallbackChain(model);

    for (let index = 0; index < chain.length; index += 1) {
      const modelId = chain[index];
      let hasYielded = false;

      try {
        const result = await client.getGenerativeModel({ model: modelId }).generateContentStream({ contents });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            hasYielded = true;
            yield text;
          }
        }
        return;
      } catch (error: any) {
        const failure = classifyFailure(error);
        if (failure === 'quota') throw createQuotaExceededError(modelId, error?.message || '');

        const isLastModel = index === chain.length - 1;
        // Once output has been streamed, switching models would duplicate it.
        if (failure === 'fatal' || isLastModel || hasYielded) throw error;

        console.warn(`[gemini] model ${modelId} failed (${error?.status || 'unknown'}), falling back to ${chain[index + 1]}`);
      }
    }
  }

  async chat({ messages, model, agentMode, providerConfig }: ChatRequest): Promise<ChatResponse> {
    const client = new GoogleGenerativeAI(resolveApiKey(providerConfig));
    const contents = toGeminiContents(messages, getSystemPrompt(agentMode));
    const chain = buildFallbackChain(model);

    for (let index = 0; index < chain.length; index += 1) {
      const modelId = chain[index];

      try {
        const result = await client.getGenerativeModel({ model: modelId }).generateContent({ contents });
        return { content: result.response.text() };
      } catch (error: any) {
        const failure = classifyFailure(error);
        if (failure === 'quota') throw createQuotaExceededError(modelId, error?.message || '');

        const isLastModel = index === chain.length - 1;
        if (failure === 'fatal' || isLastModel) throw error;

        console.warn(`[gemini] model ${modelId} failed (${error?.status || 'unknown'}), falling back to ${chain[index + 1]}`);
      }
    }

    throw new Error('Gemini request failed for every model in the fallback chain');
  }

  async listModels(_providerConfig: ProviderConfig): Promise<ModelSummary[]> {
    return GEMINI_MODELS.map(({ id, name }) => ({ id, name }));
  }
}
