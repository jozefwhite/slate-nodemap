import crypto from 'crypto';
import { PodcastResult } from '@/lib/types';

export async function searchPodcasts(
  query: string,
  apiKey: string,
  apiSecret: string,
  limit = 3
): Promise<PodcastResult[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const authHash = crypto
      .createHash('sha1')
      .update(apiKey + apiSecret + now)
      .digest('hex');

    const url = new URL('https://api.podcastindex.org/api/1.0/search/byterm');
    url.searchParams.set('q', query);
    url.searchParams.set('max', String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        'X-Auth-Key': apiKey,
        'X-Auth-Date': String(now),
        Authorization: authHash,
        'User-Agent': 'nodemap/0.1',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.feeds || []).map((feed: Record<string, unknown>) => ({
      title: feed.title || '',
      description: (feed.description as string || '').slice(0, 200),
      imageUrl: feed.image || feed.artwork || '',
      url: feed.url || '',
    }));
  } catch {
    return [];
  }
}
