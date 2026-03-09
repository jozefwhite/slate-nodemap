'use client';

import { useExploration } from '@/hooks/useExploration';

export default function PathBreadcrumb() {
  const { path } = useExploration();

  if (path.length === 0) return null;

  return (
    <div className="h-8 border-t border-surface-2 bg-white/80 backdrop-blur flex items-center px-4 gap-2 overflow-x-auto hide-scrollbar">
      <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 flex-shrink-0">
        path
      </span>
      <div className="flex items-center gap-1 text-xs text-ink-2">
        {path.map((step, i) => (
          <span key={`${step.nodeId}-${i}`} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <span className="text-ink-3">&rarr;</span>}
            <span className="hover:text-ink-0 transition-colors cursor-default">
              {step.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
