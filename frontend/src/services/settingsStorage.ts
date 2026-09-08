import { Settings } from '../types';

const SETTINGS_STORAGE_KEY = 'gemini-chat-settings';
const DEFAULT_MODEL = 'gemini-2.5-flash';

/** Ids that were never real Gemini models, or have been retired. */
const RETIRED_MODEL_IDS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-nano', 'gemini-1.5-flash-8b'];

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  apiKey: '',
  baseUrl: '',
  model: DEFAULT_MODEL,
  theme: 'dark',
  allowedPath: '',
  enableFileManager: false,
  enableGit: false,
};

function normalizeModel(model: unknown): string {
  return typeof model === 'string' && model && !RETIRED_MODEL_IDS.includes(model) ? model : DEFAULT_MODEL;
}

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);
    return {
      provider: parsed.provider || DEFAULT_SETTINGS.provider,
      apiKey: parsed.apiKey || '',
      baseUrl: parsed.baseUrl || '',
      model: normalizeModel(parsed.model),
      theme: parsed.theme || DEFAULT_SETTINGS.theme,
      allowedPath: parsed.allowedPath || '',
      enableFileManager: Boolean(parsed.enableFileManager),
      enableGit: Boolean(parsed.enableGit),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
