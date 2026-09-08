import { ModelSummary, ProviderType } from './providerTypes';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from './geminiProvider';

/** Shown when a provider cannot be queried for its model list. */
export const FALLBACK_MODELS: Record<ProviderType, ModelSummary[]> = {
  gemini: GEMINI_MODELS.map(({ id, name }) => ({ id, name })),
  chatgpt: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  ollama: [
    { id: 'llama3', name: 'Llama 3' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'CodeLlama' },
  ],
  llamacpp: [{ id: 'default', name: 'Local Model' }],
};

/** Model used when a chat request does not name one. */
export const DEFAULT_MODEL_IDS: Record<ProviderType, string> = {
  gemini: DEFAULT_GEMINI_MODEL,
  chatgpt: 'gpt-4o-mini',
  ollama: 'llama3',
  llamacpp: 'default',
};

export function resolveDefaultModel(providerType: ProviderType): string {
  return DEFAULT_MODEL_IDS[providerType] ?? DEFAULT_MODEL_IDS.gemini;
}
