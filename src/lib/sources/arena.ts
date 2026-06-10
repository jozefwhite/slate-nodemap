export interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  length: number;
  url: string;
  description?: string;
  thumbnailUrl?: string;
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

/** Grab the first image block of a channel to use as its thumbnail */
async function fetchChannelThumb(slug: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${ARENA_BASE}/channels/${slug}/contents?per=4`, {
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    for (const block of data.contents || []) {
      const thumb = block?.image?.display?.url || block?.image?.thumb?.url;
      if (thumb) return thumb;
    }
  } catch {
    // Thumbnail is optional
  }
  return undefined;
}

export async function searchArena(query: string): Promise<ArenaSearchResult> {
  try {
    const res = await fetch(
      `${ARENA_BASE}/search?q=${encodeURIComponent(query)}&per=8`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { channels: [], blocks: [] };
    const data = await res.json();

    // Substantial channels only — thin ones make dead-end nodes
    const rawChannels = (data.channels || [])
      .filter((c: { length: number }) => (c.length || 0) >= 5)
      .slice(0, 3);

    const channels: ArenaChannel[] = await Promise.all(
      rawChannels.map(async (c: Record<string, unknown>) => {
        const slug = c.slug as string;
        const userSlug =
          ((c.user as Record<string, unknown>)?.slug as string) ||
          (c.owner_slug as string) ||
          'channels';
        const metadata = c.metadata as { description?: string } | null;
        return {
          id: c.id as number,
          title: c.title as string,
          slug,
          length: c.length as number,
          url: `https://www.are.na/${userSlug}/${slug}`,
          description: metadata?.description || undefined,
          thumbnailUrl: await fetchChannelThumb(slug),
        };
      })
    );

    return {
      channels,
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
