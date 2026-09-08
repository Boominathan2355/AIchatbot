import { Settings, Conversation } from '../types/chat';

const SETTINGS_KEY = 'gemini-chat-settings';
const CONVERSATIONS_KEY = 'gemini-chat-conversations';

export function getSettings(): Settings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        provider: parsed.provider || 'gemini',
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || '',
        model: parsed.model && parsed.model !== 'gemini-2.0-flash' ? parsed.model : 'gemini-3.8-flash',
        theme: parsed.theme || 'dark',
      };
    } catch {
      // ignore JSON parse error
    }
  }
  return {
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-3.8-flash',
    theme: 'dark',
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
