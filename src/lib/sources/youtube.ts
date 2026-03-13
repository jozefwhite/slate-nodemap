import { YouTubeResult } from '@/lib/types';

export async function searchYouTube(
  query: string,
  apiKey: string,
  maxResults = 2
): Promise<YouTubeResult[]> {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown> | undefined;
      const id = item.id as Record<string, unknown> | undefined;
      const thumbnails = snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined;
      return {
        videoId: id?.videoId || '',
        title: snippet?.title || '',
        description: snippet?.description || '',
        thumbnailUrl: thumbnails?.medium?.url || thumbnails?.default?.url || '',
      };
    });
  } catch {
    return [];
  }
}
