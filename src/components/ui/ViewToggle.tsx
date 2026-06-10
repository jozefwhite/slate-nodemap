'use client';

import { useState, useEffect } from 'react';
import { Network, LayoutGrid, Layers } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { ViewMode } from '@/lib/types';

const STORAGE_KEY = 'nodemap-views-tried';

const views: { mode: ViewMode; icon: typeof Network; label: string }[] = [
  { mode: 'graph', icon: Network, label: 'Graph — drag nodes, see the whole web' },
  { mode: 'moodboard', icon: LayoutGrid, label: 'Moodboard — scan everything as cards' },
  { mode: 'journey', icon: Layers, label: 'Journey — travel your layers in 3D' },
];

export default function ViewToggle() {
  const { viewMode, setViewMode } = useExploration();
  const [tried, setTried] = useState<Set<string>>(new Set(['graph']));

  // Load which views the user has already tried
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setTried(new Set(['graph', ...stored]));
    } catch {
      // First visit
    }
  }, []);

  const handleSelect = (mode: ViewMode) => {
    setViewMode(mode);
    if (!tried.has(mode)) {
      const next = new Set(tried).add(mode);
      setTried(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // localStorage unavailable — nudge just persists, harmless
      }
    }
  };

  return (
    <div className="flex border border-surface-2">
      {views.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => handleSelect(mode)}
          className={`relative p-1.5 transition-colors ${
            viewMode === mode
              ? 'bg-ink-0 text-white'
              : 'bg-white text-ink-3 hover:text-ink-1'
          }`}
          title={label}
        >
          <Icon size={14} />
          {/* Nudge: pulse on views not yet explored */}
          {!tried.has(mode) && viewMode !== mode && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full animate-pulse-subtle" />
          )}
        </button>
      ))}
    </div>
  );
}
