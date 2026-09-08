import { ChatRequest, ChatResponse, ModelSummary, Provider, ProviderConfig, ProviderType } from './providerTypes';
import { GeminiProvider } from './geminiProvider';
import { OpenAICompatibleProvider } from './openAICompatibleProvider';

export function createProvider(type: ProviderType): Provider {
  switch (type) {
    case 'chatgpt':
    case 'ollama':
    case 'llamacpp':
      return new OpenAICompatibleProvider(type);
    case 'gemini':
    default:
      return new GeminiProvider();
  }
}

export function streamChatWithProvider(request: ChatRequest): AsyncGenerator<string, void, unknown> {
  return createProvider(request.providerConfig.type).streamChat(request);
}

export function chatWithProvider(request: ChatRequest): Promise<ChatResponse> {
  return createProvider(request.providerConfig.type).chat(request);
}

export function listProviderModels(providerConfig: ProviderConfig): Promise<ModelSummary[]> {
  return createProvider(providerConfig.type).listModels(providerConfig);
}

export * from './providerTypes';
