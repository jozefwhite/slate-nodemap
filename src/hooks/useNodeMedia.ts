import { useState, useEffect, useRef, useCallback } from 'react';
import { YouTubeResult, BookResult, PodcastResult, MusicResult } from '@/lib/types';

interface SourceState<T> {
  loading: boolean;
  results: T[];
}

export interface MediaState {
  youtube: SourceState<YouTubeResult>;
  books: SourceState<BookResult>;
  podcasts: SourceState<PodcastResult>;
  music: SourceState<MusicResult>;
}

const empty = <T,>(): SourceState<T> => ({ loading: false, results: [] });
const loading = <T,>(): SourceState<T> => ({ loading: true, results: [] });

export function useNodeMedia(nodeLabel: string | null): MediaState {
  const [media, setMedia] = useState<MediaState>({
    youtube: empty(),
    books: empty(),
    podcasts: empty(),
    music: empty(),
  });

  const cacheRef = useRef<Map<string, MediaState>>(new Map());

  const fetchSource = useCallback(
    async <T,>(
      key: keyof MediaState,
      url: string,
      label: string
    ) => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        const results: T[] = data.results || [];
        setMedia((prev) => {
          const next = { ...prev, [key]: { loading: false, results } };
          cacheRef.current.set(label, next);
          return next;
        });
      } catch {
        setMedia((prev) => ({ ...prev, [key]: { loading: false, results: [] } }));
      }
    },
    []
  );

  useEffect(() => {
    if (!nodeLabel) return;

    // Check cache
    const cached = cacheRef.current.get(nodeLabel);
    if (cached) {
      setMedia(cached);
      return;
    }

    // Set all to loading
    setMedia({
      youtube: loading(),
      books: loading(),
      podcasts: loading(),
      music: loading(),
    });

    const q = encodeURIComponent(nodeLabel);

    // Fire all requests in parallel — each section updates independently
    fetchSource('youtube', `/api/youtube?q=${q}`, nodeLabel);
    fetchSource('books', `/api/openlib?q=${q}`, nodeLabel);
    fetchSource('podcasts', `/api/podcast?q=${q}`, nodeLabel);
    fetchSource('music', `/api/itunes?q=${q}`, nodeLabel);
  }, [nodeLabel, fetchSource]);

  return media;
}
