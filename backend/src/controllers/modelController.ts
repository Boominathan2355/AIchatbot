import { Request, Response } from 'express';
import { listProviderModels, ProviderType } from '../services/providers';
import { GEMINI_MODELS } from '../services/providers/gemini';

export async function handleListModels(req: Request, res: Response): Promise<void> {
  const { provider = 'gemini', baseUrl } = req.query;

  // The provider key arrives as a header, never a query string - query
  // parameters end up in access logs, proxy logs and browser history.
  const apiKey = (req.headers['x-provider-key'] as string) || undefined;

  const providerType = provider as ProviderType;

  try {
    const models = await listProviderModels(providerType, {
      type: providerType,
      apiKey,
      baseUrl: (baseUrl as string) || undefined,
    });

    res.json({ data: models });
  } catch (error: any) {
    console.error('Failed to list models:', error);

    const defaults: Record<string, { id: string; name: string }[]> = {
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
      llamacpp: [
        { id: 'default', name: 'Local Model' },
      ],
    };

    res.json({ data: defaults[providerType] || defaults.gemini });
  }
}
