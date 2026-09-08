import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './env';

let genAI: GoogleGenerativeAI | null = null;

export function initializeGemini(apiKey?: string): GoogleGenerativeAI {
  const key = apiKey || config.geminiApiKey;
  if (!key) {
    throw new Error('Gemini API key is required. Set GEMINI_API_KEY in .env or provide via settings.');
  }
  genAI = new GoogleGenerativeAI(key);
  return genAI;
}

export function getGemini(): GoogleGenerativeAI {
  if (!genAI) {
    return initializeGemini();
  }
  return genAI;
}

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export function getDefaultModels() {
  return [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fastest, best for most tasks' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning and analysis' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Legacy model, may be unavailable' },
  ];
}
