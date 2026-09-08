import { Request, Response } from 'express';
import { listProviderModels } from '../services/providers/providerFactory';
import { ProviderType, isProviderType } from '../services/providers/providerTypes';
import { FALLBACK_MODELS } from '../services/providers/defaultModels';
import { sendData } from '../utils/apiResponse';

const PROVIDER_KEY_HEADER = 'x-provider-key';
const DEFAULT_PROVIDER: ProviderType = 'gemini';

/** GET /api/models?provider=&baseUrl= - lists models for a provider, falling back to a static list. */
export async function listModels(req: Request, res: Response): Promise<void> {
  const providerType = isProviderType(req.query.provider) ? req.query.provider : DEFAULT_PROVIDER;
  const baseUrl = (req.query.baseUrl as string) || undefined;

  // The provider key arrives as a header, never a query string - query
  // parameters end up in access logs, proxy logs and browser history.
  const apiKey = (req.headers[PROVIDER_KEY_HEADER] as string) || undefined;

  try {
    const models = await listProviderModels({ type: providerType, apiKey, baseUrl });
    sendData(res, models);
  } catch (error) {
    console.error('[models] list failed:', error);
    sendData(res, FALLBACK_MODELS[providerType]);
  }
}
