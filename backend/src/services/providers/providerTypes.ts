export const PROVIDER_TYPES = ['gemini', 'chatgpt', 'ollama', 'llamacpp'] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export function isProviderType(value: unknown): value is ProviderType {
  return typeof value === 'string' && (PROVIDER_TYPES as readonly string[]).includes(value);
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  /** Absent for attachments stored as metadata only. */
  base64Data?: string;
  mimeType: string;
  preview?: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  attachments?: Attachment[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  /** Selects the shared system prompt; see prompts/systemPrompts.ts. */
  agentMode?: string;
  providerConfig: ProviderConfig;
}

export interface ChatResponse {
  content: string;
}

export interface ModelSummary {
  id: string;
  name: string;
}

export interface Provider {
  streamChat(request: ChatRequest): AsyncGenerator<string, void, unknown>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  listModels(providerConfig: ProviderConfig): Promise<ModelSummary[]>;
}
