/**
 * Free, keyless web data sources used for realtime context. Every function
 * returns a human-readable block that is pasted into the model prompt.
 */

const USER_AGENT = 'aichatbot/1.0';
const PAGE_TEXT_LIMIT = 8000;
const TOP_STORIES_LIMIT = 5;
const RELATED_TOPICS_LIMIT = 3;
const WIKI_QUERY_WORD_LIMIT = 5;

/** London, used when a weather request names no location. */
const DEFAULT_COORDINATES = { latitude: 51.5, longitude: -0.12 };

async function fetchJson<T = any>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  return response.json() as Promise<T>;
}

export async function fetchWikipediaSummary(query: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return `Wiki fetch failed ${response.status}`;
    const summary: any = await response.json();
    return `Wikipedia: ${summary.title}\n${summary.extract}\nSource: ${summary.content_urls?.desktop?.page || url}`;
  } catch (error: any) {
    return `Wiki error: ${error.message}`;
  }
}

export async function searchDuckDuckGo(query: string): Promise<string> {
  try {
    const result = await fetchJson(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const topics = (result.RelatedTopics || [])
      .slice(0, RELATED_TOPICS_LIMIT)
      .map((topic: any) => topic.Text || topic.Result)
      .join('\n');
    return `DuckDuckGo: ${result.AbstractText || 'No abstract'}\n${topics}\nSource: ${result.AbstractURL || 'https://duckduckgo.com'}`;
  } catch (error: any) {
    return `DDG error: ${error.message}`;
  }
}

export async function fetchWeatherForecast(latitude: number, longitude: number): Promise<string> {
  try {
    const forecast = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        '&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto'
    );
    return (
      `Weather (${latitude},${longitude}): now ${forecast.current?.temperature_2m}°C ` +
      `wind ${forecast.current?.wind_speed_10m} km/h, today max ${forecast.daily?.temperature_2m_max?.[0]} ` +
      `min ${forecast.daily?.temperature_2m_min?.[0]} Source: open-meteo.com`
    );
  } catch (error: any) {
    return `Weather error: ${error.message}`;
  }
}

export async function fetchHackerNewsTopStories(): Promise<string> {
  try {
    const ids: number[] = await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json');
    const stories = await Promise.all(
      ids.slice(0, TOP_STORIES_LIMIT).map((id) => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))
    );
    const lines = stories.map((story: any, index) => `${index + 1}. ${story.title} (${story.url || ''}) score:${story.score}`);
    return `HackerNews Top ${TOP_STORIES_LIMIT}:\n${lines.join('\n')}\nSource: hacker-news.firebaseio.com`;
  } catch (error: any) {
    return `HN error: ${error.message}`;
  }
}

/** Fetches a page and returns its visible text, tags stripped, truncated. */
export async function fetchPageText(url: string): Promise<string> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const html = await response.text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, PAGE_TEXT_LIMIT);
    return `Fetch ${url} (${response.status}):\n${text}\nSource: ${url}`;
  } catch (error: any) {
    return `Fetch error: ${error.message}`;
  }
}

async function geocodeCity(city: string): Promise<{ latitude: number; longitude: number } | null> {
  const result = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const match = result.results?.[0];
  return match ? { latitude: match.latitude, longitude: match.longitude } : null;
}

/** Picks the sources that fit the query and joins their output into one context block. */
export async function collectWebContext(query: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  const sections: string[] = [];

  if (/weather|temperature|forecast/.test(lowerQuery)) {
    try {
      const cityMatch = lowerQuery.match(/in\s+([a-z]+)/);
      const coordinates = cityMatch ? await geocodeCity(cityMatch[1]) : DEFAULT_COORDINATES;
      if (coordinates) sections.push(await fetchWeatherForecast(coordinates.latitude, coordinates.longitude));
    } catch {
      // Weather is best-effort.
    }
  }

  if (/news|hacker|tech news/.test(lowerQuery)) {
    sections.push(await fetchHackerNewsTopStories());
  }

  const urlMatch = query.match(/https?:\/\/\S+/);
  if (urlMatch) sections.push(await fetchPageText(urlMatch[0]));

  if (sections.length === 0) {
    const wikiQuery = query.split(' ').slice(0, WIKI_QUERY_WORD_LIMIT).join(' ');
    sections.push(await fetchWikipediaSummary(wikiQuery));
    sections.push(await searchDuckDuckGo(query));
  }

  return sections.join('\n\n---\n\n');
}
