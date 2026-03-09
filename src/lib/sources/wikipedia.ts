import { WikipediaSummary } from '@/lib/types';

const USER_AGENT = 'nodemap/0.1 (hackathon project)';

export async function fetchSummary(title: string): Promise<WikipediaSummary | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: { 'Api-User-Agent': USER_AGENT },
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      extract: data.extract,
      thumbnail: data.thumbnail
        ? { source: data.thumbnail.source, width: data.thumbnail.width, height: data.thumbnail.height }
        : undefined,
      content_urls: data.content_urls,
    };
  } catch {
    return null;
  }
}

export async function fetchIntro(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`,
      {
        headers: { 'Api-User-Agent': USER_AGENT },
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null;
    return pages[pageId]?.extract || null;
  } catch {
    return null;
  }
}

export async function fetchLinks(title: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=links&pllimit=10&plnamespace=0&format=json&origin=*`,
      {
        headers: { 'Api-User-Agent': USER_AGENT },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];
    const pageId = Object.keys(pages)[0];
    const links = pages[pageId]?.links;
    if (!links) return [];
    return links.map((l: { title: string }) => l.title);
  } catch {
    return [];
  }
}

export async function searchWikipedia(query: string): Promise<{ titles: string[] }> {
  try {
    // Use full-text search which handles typos and misspellings much better than opensearch
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`,
      {
        headers: { 'Api-User-Agent': USER_AGENT },
        cache: 'no-store',
      }
    );
    if (!res.ok) return { titles: [] };
    const data = await res.json();
    const results = data.query?.search;
    if (!results || results.length === 0) return { titles: [] };
    return { titles: results.map((r: { title: string }) => r.title) };
  } catch {
    return { titles: [] };
  }
}

// Find semantically related Wikipedia articles using morelike search
export async function fetchRelated(title: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=morelike:${encodeURIComponent(title)}&srlimit=8&format=json&origin=*`,
      {
        headers: { 'Api-User-Agent': USER_AGENT },
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.query?.search;
    if (!results || results.length === 0) return [];
    return results
      .map((r: { title: string }) => r.title)
      .filter((t: string) => t.toLowerCase() !== title.toLowerCase());
  } catch {
    return [];
  }
}

// Use Google's suggestion API to correct spelling before searching
export async function suggestCorrection(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const suggestions: string[] = data[1];
    if (!suggestions || suggestions.length === 0) return null;
    // Return first suggestion if it differs from the original
    const first = suggestions[0];
    if (first.toLowerCase() !== query.toLowerCase()) return first;
    return null;
  } catch {
    return null;
  }
}
