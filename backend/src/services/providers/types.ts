export type ProviderType = 'gemini' | 'chatgpt' | 'ollama' | 'llamacpp';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  base64Data: string;
  mimeType: string;
  preview?: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  model: string;
  config: ProviderConfig;
}

export interface ProviderResponse {
  content: string;
}

export interface Provider {
  streamChat(options: StreamChatOptions): AsyncGenerator<string, void, unknown>;
  chat(options: StreamChatOptions): Promise<ProviderResponse>;
  listModels(config: ProviderConfig): Promise<{ id: string; name: string }[]>;
}
