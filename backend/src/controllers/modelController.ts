import { Request, Response } from 'express';
import { listProviderModels, ProviderType } from '../services/providers';

export async function handleListModels(req: Request, res: Response): Promise<void> {
  const { provider = 'gemini', apiKey, baseUrl } = req.query;

  const providerType = provider as ProviderType;

  try {
    const models = await listProviderModels(providerType, {
      type: providerType,
      apiKey: (apiKey as string) || undefined,
      baseUrl: (baseUrl as string) || undefined,
    });

    res.json({ data: models });
  } catch (error: any) {
    console.error('Failed to list models:', error);

    // Fallback defaults
    const defaults: Record<string, { id: string; name: string }[]> = {
      gemini: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
        { id: 'gemini-nano', name: 'Gemini Nano' },
      ],
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
      llamacpp: [
        { id: 'default', name: 'Local Model' },
      ],
    };

    res.json({ data: defaults[providerType] || defaults.gemini });
  }
}
