'use client';

import { useExploration } from '@/hooks/useExploration';

export default function PathBreadcrumb() {
  const { path, nodes, setActiveNode, setCenterNodeId } = useExploration();

  if (path.length === 0) return null;

  const handleStepClick = (nodeId: string) => {
    // Only navigate if the node still exists (it may have been removed)
    const exists = nodes.some((n) => n.id === nodeId);
    if (!exists) return;
    setActiveNode(nodeId);
    setCenterNodeId(nodeId);
  };

  return (
    <div className="h-8 border-t border-surface-2 bg-white/80 backdrop-blur flex items-center px-4 gap-2 overflow-x-auto hide-scrollbar">
      <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 flex-shrink-0">
        path
      </span>
      <div className="flex items-center gap-1 text-xs text-ink-2">
        {path.map((step, i) => {
          const exists = nodes.some((n) => n.id === step.nodeId);
          return (
            <span key={`${step.nodeId}-${i}`} className="flex items-center gap-1 flex-shrink-0">
              {i > 0 && <span className="text-ink-3">&rarr;</span>}
              <button
                onClick={() => handleStepClick(step.nodeId)}
                disabled={!exists}
                className={`transition-colors ${
                  exists
                    ? 'hover:text-accent cursor-pointer'
                    : 'text-ink-3/50 cursor-default line-through'
                }`}
              >
                {step.label}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
