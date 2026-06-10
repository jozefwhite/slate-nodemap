'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useExploration } from './useExploration';
import { makeNode } from '@/lib/graph-utils';

/**
 * Shared search/seed logic — used by SearchInput and the landing-page
 * example chips. Resolves a term against Wikipedia + dictionary, creates
 * the root node, and navigates to /explore.
 */
export function useStartExploration() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { startSearch, addNodes, setLoading: setGlobalLoading } = useExploration();

  const start = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;

      setLoading(true);

      // Single atomic state update: resets everything and sets seedTerm + isLoading
      startSearch(trimmed);

      // Navigate to explore immediately so the loading screen shows
      if (pathname !== '/explore') {
        router.push('/explore');
      }

      try {
        const isSingleWord = !trimmed.includes(' ');
        const [wikiRes, dictRes] = await Promise.all([
          fetch(`/api/wikipedia?title=${encodeURIComponent(trimmed)}`),
          isSingleWord
            ? fetch(`/api/dictionary?word=${encodeURIComponent(trimmed)}`)
            : Promise.resolve(null),
        ]);

        const wikiData = await wikiRes.json();
        const dictData = dictRes ? await dictRes.json() : null;

        let rootNode;
        if (wikiData.summary) {
          const summary = wikiData.intro || wikiData.summary.extract || '';
          const tags: string[] = [];

          if (dictData?.entry?.meanings) {
            for (const meaning of dictData.entry.meanings) {
              if (meaning.partOfSpeech && !tags.includes(meaning.partOfSpeech)) {
                tags.push(meaning.partOfSpeech);
              }
            }
          }

          rootNode = makeNode(wikiData.summary.title || trimmed, 'wikipedia', { x: 0, y: 0 }, {
            summary,
            imageUrl: wikiData.summary.thumbnail?.source,
            url: wikiData.summary.content_urls?.desktop?.page,
            tags,
            depth: 0,
          });
        } else if (dictData?.entry) {
          const meanings = dictData.entry.meanings || [];
          const firstDef = meanings[0]?.definitions?.[0]?.definition || '';
          const tags = meanings.map((m: { partOfSpeech: string }) => m.partOfSpeech).filter(Boolean);

          rootNode = makeNode(dictData.entry.word || trimmed, 'dictionary', { x: 0, y: 0 }, {
            summary: firstDef,
            tags,
            depth: 0,
          });
        } else {
          rootNode = makeNode(trimmed, 'user', { x: 0, y: 0 }, { depth: 0 });
        }

        addNodes([rootNode], []);
      } catch (error) {
        console.error('Search failed:', error);
        const rootNode = makeNode(trimmed, 'user', { x: 0, y: 0 }, { depth: 0 });
        addNodes([rootNode], []);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    },
    [startSearch, addNodes, setGlobalLoading, router, pathname]
  );

  return { start, loading };
}
