export interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  length: number;
}

export interface ArenaBlock {
  id: number;
  title: string;
  description?: string;
  image?: {
    thumb?: { url: string };
    display?: { url: string };
  };
  source?: { url: string };
  class: string;
}

export interface ArenaSearchResult {
  channels: ArenaChannel[];
  blocks: ArenaBlock[];
}

const ARENA_BASE = 'https://api.are.na/v2';

export async function searchArena(query: string): Promise<ArenaSearchResult> {
  try {
    const res = await fetch(
      `${ARENA_BASE}/search?q=${encodeURIComponent(query)}&per=5`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { channels: [], blocks: [] };
    const data = await res.json();
    return {
      channels: (data.channels || []).slice(0, 3).map((c: Record<string, unknown>) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        length: c.length,
      })),
      blocks: (data.blocks || []).slice(0, 3).map((b: Record<string, unknown>) => ({
        id: b.id,
        title: b.title || b.generated_title || '',
        description: b.description,
        image: b.image,
        source: b.source,
        class: b.class,
      })),
    };
  } catch {
    return { channels: [], blocks: [] };
  }
}
