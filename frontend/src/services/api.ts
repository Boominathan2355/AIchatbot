const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private apiKey: string = '';
  private authToken: string = '';
  private allowedPath: string = '';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  setAllowedPath(p: string) {
    this.allowedPath = p;
  }

  private getAuthHeaders(includeProviderKey = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    if (this.allowedPath) {
      headers['X-Allowed-Path'] = this.allowedPath;
    }
    // Sent as a header rather than a query parameter so the key never lands
    // in access logs or browser history.
    if (includeProviderKey && this.apiKey) {
      headers['X-Provider-Key'] = this.apiKey;
    }
    return headers;
  }

  private async safeFetch(url: string, options?: RequestInit): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeaders(),
        ...(options?.headers || {}),
      };
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
        throw new Error(error.error?.message || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Cannot connect to backend server. Make sure it is running on port 3001.');
      }
      throw err;
    }
  }

  // Auth
  async login(login: string, password: string): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    return result;
  }

  async register(username: string, password: string): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return result;
  }

  async getProfile(): Promise<any> {
    return this.safeFetch(`${API_BASE}/auth/profile`);
  }

  // Chat
  async chatStream(
    message: string,
    model: string,
    agentMode: string,
    attachments?: any[],
    conversationId?: string,
    provider: string = 'gemini',
    baseUrl?: string,
    signal?: AbortSignal
  ): Promise<ReadableStream<string>> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          message,
          model,
          apiKey: this.apiKey || undefined,
          agentMode,
          attachments,
          conversationId,
          provider,
          baseUrl: baseUrl || undefined,
        }),
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      throw new Error('Cannot connect to backend server. Make sure it is running on port 3001.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Network error' } }));
      throw new Error(error.error?.message || 'Failed to send message');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream({
      async start(controller) {
        let buffer = '';
        const onAbort = () => { reader.cancel().catch(() => {}); };
        signal?.addEventListener('abort', onAbort, { once: true });
        try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) throw new Error(data.error);
                if (data.content) controller.enqueue(data.content);
                if (data.done) {
                  controller.close();
                  return;
                }
              } catch (e) {
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                  controller.close();
                  return;
                }
              }
            }
          }
        }
        controller.close();
        } catch (err: any) {
          if (err?.name === 'AbortError') controller.close();
          else controller.error(err);
        } finally {
          signal?.removeEventListener('abort', onAbort);
        }
      },
    });
  }

  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const result = await this.safeFetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });
    return result.data;
  }

  async getModels(provider: string = 'gemini', baseUrl?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (provider) params.set('provider', provider);
    if (baseUrl) params.set('baseUrl', baseUrl);
    const url = `${API_BASE}/models?${params.toString()}`;
    const result = await this.safeFetch(url, { headers: this.getAuthHeaders(true) });
    return result.data || [];
  }

  // Conversations
  async getConversations(): Promise<any[]> {
    const result = await this.safeFetch(`${API_BASE}/conversations`);
    if (Array.isArray(result)) return result;
    return result.data || [];
  }

  async getConversation(id: string): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/conversations/${id}`);
    if (result && result.data) return result.data;
    return result;
  }

  async createConversation(data: { title?: string; model?: string; agentMode?: string }): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (result && result.data) return result.data;
    return result;
  }

  async updateConversation(id: string, data: any): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (result && result.data) return result.data;
    return result;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.safeFetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
  }

  // Files
  async listFiles(dirPath?: string): Promise<any> {
    const p = dirPath ? `?path=${encodeURIComponent(dirPath)}` : '';
    const result = await this.safeFetch(`${API_BASE}/files/list${p}`);
    return result.data;
  }
  async readFile(filePath: string): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`);
    return result.data;
  }
  async writeFile(filePath: string, content: string): Promise<any> {
    const result = await this.safeFetch(`${API_BASE}/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content, allowedPath: this.allowedPath }),
    });
    return result.data;
  }

  // Git
  async gitStatus(repoPath?: string): Promise<any> {
    const p = repoPath ? `?path=${encodeURIComponent(repoPath)}` : '';
    const result = await this.safeFetch(`${API_BASE}/git/status${p}`);
    return result.data;
  }
  async gitLog(repoPath?: string): Promise<any> {
    const p = repoPath ? `?path=${encodeURIComponent(repoPath)}` : '';
    const result = await this.safeFetch(`${API_BASE}/git/log${p}`);
    return result.data;
  }
}

export const api = new ApiService();
