'use client';

import { Network, LayoutGrid } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';

export default function ViewToggle() {
  const { viewMode, setViewMode } = useExploration();

  return (
    <div className="flex border border-surface-2">
      <button
        onClick={() => setViewMode('graph')}
        className={`p-1.5 transition-colors ${
          viewMode === 'graph'
            ? 'bg-ink-0 text-white'
            : 'bg-white text-ink-3 hover:text-ink-1'
        }`}
        title="Graph view"
      >
        <Network size={14} />
      </button>
      <button
        onClick={() => setViewMode('moodboard')}
        className={`p-1.5 transition-colors ${
          viewMode === 'moodboard'
            ? 'bg-ink-0 text-white'
            : 'bg-white text-ink-3 hover:text-ink-1'
        }`}
        title="Moodboard view"
      >
        <LayoutGrid size={14} />
      </button>
    </div>
  );
}
