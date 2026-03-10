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

  // Adaptive text size: shorter labels get slightly larger text
  const labelLen = data.label.length;
  const textClass = labelLen <= 14
    ? 'text-xs'
    : 'text-2xs';

  return (
    <div
      className={`
        animate-node-appear
        min-w-[80px] max-w-[180px] bg-white border border-surface-2
        px-2.5 py-2 group cursor-pointer
        transition-all duration-150
        hover:-translate-y-0.5 hover:shadow-sm
        ${selected ? 'border-ink-3 shadow-md' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />

      <div className="flex items-start gap-1.5">
        <div className={`w-1.5 h-1.5 flex-shrink-0 mt-1 rounded-full ${sourceColors[data.source]}`} />
        <span className={`${textClass} font-medium text-ink-0 leading-tight break-words`}>
          {data.label}
        </span>
        {approvedCount > 0 && (
          <div className="w-1.5 h-1.5 bg-node-user flex-shrink-0 mt-1 rounded-full ml-auto" />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />
    </div>
  );
}

export default memo(ConceptNodeComponent);
