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

export const DEFAULT_MODEL = 'gemini-3.8-flash';

export function getDefaultModels() {
  return [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Flagship, best quality' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', description: 'Balanced speed/quality' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', description: 'Fast' },
    { id: 'gemini-nano', name: 'Gemini Nano', description: 'Ultra-fast on-device nano model' },
  ];
}
