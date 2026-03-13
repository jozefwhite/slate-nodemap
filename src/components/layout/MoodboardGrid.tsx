'use client';

import { useExploration } from '@/hooks/useExploration';
import { useNodeExpand } from '@/hooks/useNodeExpand';
import { NodeSource } from '@/lib/types';

const borderColors: Record<NodeSource, string> = {
  wikipedia: 'border-l-node-wikipedia',
  dictionary: 'border-l-node-dictionary',
  wikidata: 'border-l-node-wikidata',
  image: 'border-l-node-image',
  user: 'border-l-node-user',
  arena: 'border-l-node-arena',
};

export default function MoodboardGrid() {
  const { nodes, setActiveNode } = useExploration();
  const { expand } = useNodeExpand();

  const handleClick = (nodeId: string, expanded: boolean) => {
    if (!expanded) {
      expand(nodeId);
    } else {
      setActiveNode(nodeId);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-surface-2 p-px">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px">
        {nodes.map((node) => (
          <div
            key={node.id}
            onClick={() => handleClick(node.id, node.data.expanded)}
            className={`
              bg-white border-l-2 ${borderColors[node.data.source]}
              p-3 cursor-pointer hover:bg-surface-1 transition-colors
            `}
          >
            {node.data.imageUrl && (
              <div className="aspect-video mb-2 overflow-hidden bg-surface-1">
                <img
                  src={node.data.imageUrl}
                  alt={node.data.label}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="text-xs font-medium text-ink-0 line-clamp-2 mb-1">
              {node.data.label}
            </div>

            {node.data.summary && (
              <div className="text-2xs text-ink-2 line-clamp-3 mb-1.5">
                {node.data.summary}
              </div>
            )}

            {node.data.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {node.data.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-2xs font-mono text-ink-3 bg-surface-1 px-1 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
