import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  collectWebContext,
  fetchHackerNewsTopStories,
  fetchPageText,
  fetchWeatherForecast,
  fetchWikipediaSummary,
  searchDuckDuckGo,
} from '../services/webService';
import { sendData, sendError } from '../utils/apiResponse';

/** London, used when no coordinates are supplied. */
const DEFAULT_LATITUDE = 51.5;
const DEFAULT_LONGITUDE = -0.12;

function readQueryOrBody(req: AuthenticatedRequest, key: string): string {
  return (req.query[key] as string) || req.body?.[key] || '';
}

export async function searchWeb(req: AuthenticatedRequest, res: Response): Promise<void> {
  const query = readQueryOrBody(req, 'q');
  if (!query) {
    sendError(res, 400, 'q required');
    return;
  }
  sendData(res, { query, context: await collectWebContext(query) });
}

export async function fetchWebPage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const url = readQueryOrBody(req, 'url');
  if (!url) {
    sendError(res, 400, 'url required');
    return;
  }
  sendData(res, { url, content: await fetchPageText(url) });
}

export async function getWikipediaSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendData(res, { content: await fetchWikipediaSummary(readQueryOrBody(req, 'q')) });
}

export async function getWeatherForecast(req: AuthenticatedRequest, res: Response): Promise<void> {
  const latitude = parseFloat(req.query.lat as string) || req.body?.lat || DEFAULT_LATITUDE;
  const longitude = parseFloat(req.query.lon as string) || req.body?.lon || DEFAULT_LONGITUDE;
  sendData(res, { content: await fetchWeatherForecast(latitude, longitude) });
}

export async function getTopNews(_req: AuthenticatedRequest, res: Response): Promise<void> {
  sendData(res, { content: await fetchHackerNewsTopStories() });
}

export async function searchDuckDuckGoInstant(req: AuthenticatedRequest, res: Response): Promise<void> {
  sendData(res, { content: await searchDuckDuckGo(readQueryOrBody(req, 'q')) });
}
