import { MusicResult } from '@/lib/types';

export async function searchMusic(query: string, limit = 3): Promise<MusicResult[]> {
  try {
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', query);
    url.searchParams.set('media', 'music');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((r: Record<string, unknown>) => ({
      trackName: r.trackName || r.collectionName || '',
      artistName: r.artistName || '',
      artworkUrl: r.artworkUrl100 || r.artworkUrl60 || '',
      previewUrl: (r.previewUrl as string) || null,
      trackViewUrl: r.trackViewUrl || '',
    }));
  } catch {
    return [];
  }
}
