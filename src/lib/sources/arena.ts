export interface ArenaChannel {
  id: number;
  title: string;
  slug: string;
  length: number;
  url: string;
  description?: string;
  thumbnailUrl?: string;
  userName?: string;
  blockTitles?: string[];
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

/** Flattened block for the channel-contents panel grid */
export interface ArenaContentBlock {
  id: number;
  title: string;
  class: string; // Image | Link | Text | Media | Attachment | Channel
  thumbUrl?: string;
  sourceUrl?: string;
  excerpt?: string;
}

export interface ArenaSearchResult {
  channels: ArenaChannel[];
  blocks: ArenaBlock[];
}

const ARENA_BASE = 'https://api.are.na/v2';

/** Fetch a channel's blocks, flattened for display */
export async function fetchChannelBlocks(
  slug: string,
  per = 12
): Promise<ArenaContentBlock[]> {
  try {
    const res = await fetch(`${ARENA_BASE}/channels/${slug}/contents?per=${per}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.contents || [])
      .filter((b: Record<string, unknown>) => b.class !== 'Channel')
      .map((b: Record<string, unknown>) => {
        const image = b.image as
          | { thumb?: { url?: string }; display?: { url?: string } }
          | null;
        const source = b.source as { url?: string } | null;
        const content = (b.content as string) || '';
        return {
          id: b.id as number,
          title: (b.title as string) || (b.generated_title as string) || '',
          class: b.class as string,
          thumbUrl: image?.thumb?.url || image?.display?.url,
          sourceUrl: source?.url,
          excerpt: content ? content.slice(0, 140) : undefined,
        };
      });
  } catch {
    return [];
  }
}

/** Channel preview for expansion: thumbnail + a taste of what's inside */
async function fetchChannelPreview(
  slug: string
): Promise<{ thumbnailUrl?: string; blockTitles: string[] }> {
  const blocks = await fetchChannelBlocks(slug, 6);
  const thumbnailUrl = blocks.find((b) => b.thumbUrl)?.thumbUrl;
  const blockTitles = blocks
    .map((b) => b.title)
    .filter((t) => t && t.length > 1 && t.length < 60)
    .slice(0, 3);
  return { thumbnailUrl, blockTitles };
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
        const user = c.user as { slug?: string; full_name?: string; username?: string } | null;
        const userSlug = user?.slug || (c.owner_slug as string) || 'channels';
        const metadata = c.metadata as { description?: string } | null;
        const preview = await fetchChannelPreview(slug);
        return {
          id: c.id as number,
          title: c.title as string,
          slug,
          length: c.length as number,
          url: `https://www.are.na/${userSlug}/${slug}`,
          description: metadata?.description || undefined,
          userName: user?.full_name || user?.username || undefined,
          thumbnailUrl: preview.thumbnailUrl,
          blockTitles: preview.blockTitles,
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
