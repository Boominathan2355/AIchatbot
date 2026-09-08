import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { wikiSummary, duckDuckGo, openMeteoWeather, hackerNewsTop, fetchUrl, collectWebContext } from '../services/webService';

export async function webSearch(req: AuthRequest, res: Response) {
  const q = (req.query.q as string) || req.body?.q || '';
  if (!q) { res.status(400).json({ error: { message: 'q required' } }); return; }
  const ctx = await collectWebContext(q);
  res.json({ data: { query: q, context: ctx } });
}

export async function webFetch(req: AuthRequest, res: Response) {
  const url = (req.query.url as string) || req.body?.url;
  if (!url) { res.status(400).json({ error: { message: 'url required' } }); return; }
  const content = await fetchUrl(url);
  res.json({ data: { url, content } });
}

export async function webWiki(req: AuthRequest, res: Response) {
  const q = (req.query.q as string) || req.body?.q;
  const content = await wikiSummary(q);
  res.json({ data: { content } });
}

export async function webWeather(req: AuthRequest, res: Response) {
  const lat = parseFloat(req.query.lat as string) || req.body?.lat || 51.5;
  const lon = parseFloat(req.query.lon as string) || req.body?.lon || -0.12;
  const content = await openMeteoWeather(lat, lon);
  res.json({ data: { content } });
}

export async function webNews(req: AuthRequest, res: Response) {
  const content = await hackerNewsTop();
  res.json({ data: { content } });
}

export async function webDuck(req: AuthRequest, res: Response) {
  const q = (req.query.q as string) || req.body?.q || '';
  const content = await duckDuckGo(q);
  res.json({ data: { content } });
}
