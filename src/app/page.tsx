'use client';

import SearchInput from '@/components/ui/SearchInput';
import { useStartExploration } from '@/hooks/useStartExploration';

const EXAMPLES = [
  'brutalist architecture',
  'drum and bass',
  'fermentation',
  'samurai cinema',
  'perfume',
  'cybernetics',
];

export default function Home() {
  const { start, loading } = useStartExploration();

  return (
    <div className="min-h-screen dot-grid flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-4 h-4 bg-ink-0" />
          <span className="text-sm font-medium text-ink-0">nodemap</span>
        </div>

        <p className="text-sm text-ink-2 mb-2 leading-relaxed">
          Start with a word, an idea, an image.
          <br />
          Watch it branch into a web of connections.
        </p>
        <p className="text-xs text-ink-3 mb-8 leading-relaxed">
          Explore, ask questions, gather references — then export or share your map.
        </p>

        <SearchInput />

        {/* Example searches — one tap to see the tool work */}
        <div className="mt-6">
          <p className="text-2xs font-mono uppercase tracking-wider text-ink-3 mb-3">
            or try
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => start(example)}
                disabled={loading}
                className="text-xs text-ink-2 border border-surface-2 bg-white px-3 py-1.5 hover:border-ink-3 hover:text-ink-0 disabled:opacity-40 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <p className="text-2xs font-mono uppercase tracking-wider text-ink-3 mt-10">
          wikipedia &middot; dictionary &middot; are.na &middot; books &middot; music &middot; your captures
        </p>
      </div>
    </div>
  );
}
