import { Attachment, AuthResponse, AuthUser, Conversation, ModelInfo, ToolDefinition } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const CONNECTION_ERROR = 'Cannot connect to backend server. Make sure it is running on port 3001.';

interface DataEnvelope<T> {
  data: T;
}

interface StreamEvent {
  content?: string;
  done?: boolean;
  error?: string;
  saveError?: string;
}

interface CreateConversationInput {
  title?: string;
  model?: string;
  agentMode?: string;
}

/**
 * Thin fetch wrapper for the backend API. Holds the auth token and the
 * user's provider key so every request carries them.
 */
class ApiClient {
  private providerApiKey = '';
  private authToken = '';

  setProviderApiKey(key: string): void {
    this.providerApiKey = key;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  private buildHeaders(includeProviderKey = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;
    // Sent as a header rather than a query parameter so the key never lands
    // in access logs or browser history.
    if (includeProviderKey && this.providerApiKey) headers['X-Provider-Key'] = this.providerApiKey;
    return headers;
  }

  private jsonHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', ...this.buildHeaders() };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: { ...this.buildHeaders(), ...(options.headers || {}) },
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      throw new Error(CONNECTION_ERROR);
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  private async requestData<T>(path: string, options?: RequestInit): Promise<T> {
    const envelope = await this.request<DataEnvelope<T>>(path, options);
    return envelope.data;
  }

  // Auth

  login(login: string, password: string): Promise<AuthResponse> {
    return this.requestData<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({ login, password }),
    });
  }

  register(username: string, password: string): Promise<AuthResponse> {
    return this.requestData<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({ username, password }),
    });
  }

  async getCurrentUser(): Promise<AuthUser> {
    const { user } = await this.requestData<{ user: AuthUser }>('/auth/profile');
    return user;
  }

  // Memory

  getMemory(): Promise<{ nickname: string; occupation: string; moreAbout: string; enabled: boolean }> {
    return this.requestData('/memory');
  }

  saveMemory(data: { nickname: string; occupation: string; moreAbout: string; enabled: boolean }): Promise<void> {
    return this.request('/memory', {
      method: 'PUT',
      headers: this.jsonHeaders(),
      body: JSON.stringify(data),
    }) as Promise<any>;
  }

  // Chat

  /** Opens a streaming chat completion and returns a stream of text chunks. */
  async streamChat(
    message: string,
    model: string,
    agentMode: string,
    attachments?: Attachment[],
    conversationId?: string,
    provider: string = 'gemini',
    baseUrl?: string,
    signal?: AbortSignal,
    personalization?: { nickname?: string; occupation?: string; moreAbout?: string; memoryEnabled?: boolean }
  ): Promise<ReadableStream<string>> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        signal,
        headers: this.jsonHeaders(),
        body: JSON.stringify({
          message,
          model,
          apiKey: this.providerApiKey || undefined,
          agentMode,
          attachments,
          conversationId,
          provider,
          baseUrl: baseUrl || undefined,
          personalization,
        }),
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      throw new Error(CONNECTION_ERROR);
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || 'Failed to send message');
    }
    if (!response.body) {
      throw new Error('Server returned an empty stream');
    }

    return parseEventStream(response.body, signal);
  }

  async uploadFile(file: File): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestData<Attachment>('/upload', { method: 'POST', body: formData });
  }

  async listModels(provider: string = 'gemini', baseUrl?: string): Promise<ModelInfo[]> {
    const params = new URLSearchParams();
    if (provider) params.set('provider', provider);
    if (baseUrl) params.set('baseUrl', baseUrl);
    const models = await this.requestData<ModelInfo[]>(`/models?${params.toString()}`, {
      headers: this.buildHeaders(true),
    });
    return models || [];
  }

  // Conversations

  async listConversations(): Promise<Conversation[]> {
    const conversations = await this.requestData<Conversation[]>('/conversations');
    return conversations || [];
  }

  getConversation(id: string): Promise<Conversation> {
    return this.requestData<Conversation>(`/conversations/${id}`);
  }

  createConversation(input: CreateConversationInput): Promise<Conversation> {
    return this.requestData<Conversation>('/conversations', {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify(input),
    });
  }

  updateConversation(id: string, changes: Partial<Pick<Conversation, 'title' | 'agentMode'>>): Promise<Conversation> {
    return this.requestData<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      headers: this.jsonHeaders(),
      body: JSON.stringify(changes),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.request(`/conversations/${id}`, { method: 'DELETE' });
  }

  // Tools

  listTools(): Promise<ToolDefinition[]> {
    return this.requestData<ToolDefinition[]>('/tools');
  }
}

/** Turns the server's `data: {...}` event stream into a stream of text chunks. */
function parseEventStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal): ReadableStream<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async start(controller) {
      let buffer = '';
      const onAbort = () => {
        reader.cancel().catch(() => {});
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line.slice('data: '.length));
            } catch {
              // A partial frame; the remainder arrives with the next chunk.
              continue;
            }

            if (event.error) throw new Error(event.error);
            if (event.content) controller.enqueue(event.content);
            if (event.done) {
              controller.close();
              return;
            }
          }
        }
        controller.close();
      } catch (error: any) {
        if (error?.name === 'AbortError') controller.close();
        else controller.error(error);
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }
    },
  });
}

export const apiClient = new ApiClient();
