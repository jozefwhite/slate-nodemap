'use client';

import { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { useStartExploration } from '@/hooks/useStartExploration';

interface SearchInputProps {
  onSearch?: () => void;
  compact?: boolean;
}

export default function SearchInput({ onSearch, compact }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const { nodes } = useExploration();
  const { start, loading } = useStartExploration();

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

    await start(term);
    setQuery('');
    onSearch?.();
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
