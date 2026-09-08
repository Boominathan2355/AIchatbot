// Free APIs – no paid search cost
export async function wikiSummary(query: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'aichatbot/1.0' } });
    if (!res.ok) return `Wiki fetch failed ${res.status}`;
    const j: any = await res.json();
    return `Wikipedia: ${j.title}\n${j.extract}\nSource: ${j.content_urls?.desktop?.page || url}`;
  } catch (e: any) { return `Wiki error: ${e.message}`; }
}

export async function duckDuckGo(q: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const j: any = await res.json();
    const topics = (j.RelatedTopics || []).slice(0,3).map((t:any)=> t.Text || t.Result).join('\n');
    return `DuckDuckGo: ${j.AbstractText || 'No abstract'}\n${topics}\nSource: ${j.AbstractURL || 'https://duckduckgo.com'}`;
  } catch (e:any){ return `DDG error: ${e.message}`; }
}

export async function openMeteoWeather(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(url);
    const j:any = await res.json();
    return `Weather (${lat},${lon}): now ${j.current?.temperature_2m}°C wind ${j.current?.wind_speed_10m} km/h, today max ${j.daily?.temperature_2m_max?.[0]} min ${j.daily?.temperature_2m_min?.[0]} Source: open-meteo.com`;
  } catch(e:any){ return `Weather error: ${e.message}`; }
}

export async function hackerNewsTop(): Promise<string> {
  try {
    const ids:any = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r=>r.json());
    const top = ids.slice(0,5);
    const items = await Promise.all(top.map((id:number)=> fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));
    return `HackerNews Top 5:\n` + items.map((it:any,i:number)=> `${i+1}. ${it.title} (${it.url || ''}) score:${it.score}`).join('\n') + `\nSource: hacker-news.firebaseio.com`;
  } catch(e:any){ return `HN error: ${e.message}`; }
}

export async function fetchUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'aichatbot/1.0' } });
    const text = await res.text();
    const snippet = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').slice(0,8000);
    return `Fetch ${url} (${res.status}):\n${snippet}\nSource: ${url}`;
  } catch(e:any){ return `Fetch error: ${e.message}`; }
}

export async function collectWebContext(query: string): Promise<string> {
  const lower = query.toLowerCase();
  const parts: string[] = [];
  // Heuristic: weather
  if (/weather|temperature|forecast/.test(lower)) {
    // default to London if no coords parsed
    const m = lower.match(/in\s+([a-z]+)/);
    // simple geocode via open-meteo geocoding free
    try {
      if (m) {
        const city = m[1];
        const geo:any = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then(r=>r.json());
        const r = geo.results?.[0];
        if (r) parts.push(await openMeteoWeather(r.latitude, r.longitude));
      } else {
        parts.push(await openMeteoWeather(51.5, -0.12)); // London
      }
    } catch {}
  }
  if (/news|hacker|tech news/.test(lower)) {
    parts.push(await hackerNewsTop());
  }
  // extract url if present
  const urlMatch = query.match(/https?:\/\/\S+/);
  if (urlMatch) parts.push(await fetchUrl(urlMatch[0]));

  // fallback: wiki + ddg for general queries (free)
  if (parts.length===0) {
    // use first 4 words as wiki query
    const q = query.split(' ').slice(0,5).join(' ');
    parts.push(await wikiSummary(q));
    parts.push(await duckDuckGo(query));
  }
  return parts.join('\n\n---\n\n');
}
