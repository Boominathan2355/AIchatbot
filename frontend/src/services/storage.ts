import { Settings, Conversation } from '../types/chat';

const SETTINGS_KEY = 'gemini-chat-settings';
const CONVERSATIONS_KEY = 'gemini-chat-conversations';

export function getSettings(): Settings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Ids that were never real Gemini models, or have been retired.
      const deprecated = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-nano', 'gemini-1.5-flash-8b'];
      return {
        provider: parsed.provider || 'gemini',
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || '',
        model: parsed.model && !deprecated.includes(parsed.model) ? parsed.model : 'gemini-2.5-flash',
        theme: parsed.theme || 'dark',
        allowedPath: parsed.allowedPath || '',
        enableFileManager: parsed.enableFileManager || false,
        enableGit: parsed.enableGit || false,
      };
    } catch {
      // ignore JSON parse error
    }
  }
  return {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-2.5-flash',
    theme: 'dark',
    allowedPath: '',
    enableFileManager: false,
    enableGit: false,
  };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getConversations(): Conversation[] {
  const stored = localStorage.getItem(CONVERSATIONS_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}
