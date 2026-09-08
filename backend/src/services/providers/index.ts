import { Provider, ProviderType, StreamChatOptions, ProviderResponse, ProviderConfig } from './types';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';

export function createProvider(type: ProviderType): Provider {
  switch (type) {
    case 'gemini':
      return new GeminiProvider();
    case 'chatgpt':
    case 'ollama':
    case 'llamacpp':
      return new OpenAIProvider(type);
    default:
      return new GeminiProvider();
  }
}

export async function* streamChatWithProvider(options: StreamChatOptions & { providerType: ProviderType }): AsyncGenerator<string, void, unknown> {
  const provider = createProvider(options.providerType);
  yield* provider.streamChat(options);
}

export async function chatWithProvider(options: StreamChatOptions & { providerType: ProviderType }): Promise<ProviderResponse> {
  const provider = createProvider(options.providerType);
  return provider.chat(options);
}

export async function listProviderModels(providerType: ProviderType, config: ProviderConfig): Promise<{ id: string; name: string }[]> {
  const provider = createProvider(providerType);
  return provider.listModels(config);
}

export * from './types';
