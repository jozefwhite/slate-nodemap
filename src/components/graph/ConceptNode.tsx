'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ConceptNodeData, NodeSource } from '@/lib/types';

const sourceColors: Record<NodeSource, string> = {
  wikipedia: 'bg-node-wikipedia',
  dictionary: 'bg-node-dictionary',
  wikidata: 'bg-node-wikidata',
  image: 'bg-node-image',
  user: 'bg-node-user',
};

function ConceptNodeComponent({ data, selected }: NodeProps<ConceptNodeData>) {
  const approvedCount = data.conversations.filter((c) => c.approved).length;

  return (
    <div
      className={`
        animate-node-appear
        min-w-[120px] max-w-[200px] bg-white border border-surface-2
        px-3 py-2.5 group cursor-pointer
        transition-all duration-150
        hover:-translate-y-0.5 hover:shadow-sm
        ${selected ? 'border-ink-3 shadow-md' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />

      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-1.5 h-1.5 flex-shrink-0 ${sourceColors[data.source]}`} />
        <span className="text-sm font-medium text-ink-0 truncate">
          {data.label}
        </span>
        {approvedCount > 0 && (
          <div className="w-1.5 h-1.5 bg-node-user flex-shrink-0 ml-auto" />
        )}
      </div>

      <span className="text-2xs text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity">
        click to expand
      </span>

      <Handle type="source" position={Position.Right} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />
    </div>
  );
}

export default memo(ConceptNodeComponent);
