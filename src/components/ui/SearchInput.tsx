'use client';

import { useState, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { makeNode } from '@/lib/graph-utils';

interface SearchInputProps {
  onSearch?: () => void;
  compact?: boolean;
}

export default function SearchInput({ onSearch, compact }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { nodes, startSearch, addNodes, setLoading: setGlobalLoading } = useExploration();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;

    // Warn if there's unsaved work (only when searching from toolbar in explore page)
    if (compact && nodes.length > 0) {
      const confirmed = window.confirm(
        'Starting a new search will replace your current map. Continue?'
      );
      if (!confirmed) return;
    }

    setLoading(true);

    // Single atomic state update: resets everything and sets seedTerm + isLoading
    startSearch(term);

    // Navigate to explore immediately so the loading screen shows
    if (pathname !== '/explore') {
      router.push('/explore');
    }

    try {
      const isSingleWord = !term.includes(' ');
      const [wikiRes, dictRes] = await Promise.all([
        fetch(`/api/wikipedia?title=${encodeURIComponent(term)}`),
        isSingleWord
          ? fetch(`/api/dictionary?word=${encodeURIComponent(term)}`)
          : Promise.resolve(null),
      ]);

      const wikiData = await wikiRes.json();
      const dictData = dictRes ? await dictRes.json() : null;

      let rootNode;
      if (wikiData.summary) {
        // Use the full intro section if available, otherwise fall back to extract
        let summary = wikiData.intro || wikiData.summary.extract || '';
        const tags: string[] = [];

        if (dictData?.entry?.meanings) {
          for (const meaning of dictData.entry.meanings) {
            if (meaning.partOfSpeech && !tags.includes(meaning.partOfSpeech)) {
              tags.push(meaning.partOfSpeech);
            }
          }
        }

        rootNode = makeNode(wikiData.summary.title || term, 'wikipedia', { x: 0, y: 0 }, {
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

        rootNode = makeNode(dictData.entry.word || term, 'dictionary', { x: 0, y: 0 }, {
          summary: firstDef,
          tags,
          depth: 0,
        });
      } else {
        rootNode = makeNode(term, 'user', { x: 0, y: 0 }, { depth: 0 });
      }

      addNodes([rootNode], []);
      setQuery('');
      onSearch?.();
    } catch (error) {
      console.error('Search failed:', error);
      const rootNode = makeNode(term, 'user', { x: 0, y: 0 }, { depth: 0 });
      addNodes([rootNode], []);
      setQuery('');
      onSearch?.();
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? 'flex-1' : 'w-full max-w-md'}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="start with anything..."
          disabled={loading}
          className={`
            w-full bg-surface-1 border border-surface-2 text-sm text-ink-1
            placeholder:text-ink-3 focus:outline-none focus:border-ink-3
            transition-colors
            ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-3'}
          `}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`
            absolute right-0 top-0 bottom-0 flex items-center justify-center
            text-ink-3 hover:text-ink-1 disabled:opacity-30
            transition-colors
            ${compact ? 'px-2' : 'px-3'}
          `}
        >
          <Search size={compact ? 14 : 16} />
        </button>
      </div>
    </form>
  );
}
