'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ConceptNodeData, NodeSource } from '@/lib/types';
import { useIsMobile } from '@/hooks/useIsMobile';

const sourceColors: Record<NodeSource, string> = {
  wikipedia: 'bg-node-wikipedia',
  dictionary: 'bg-node-dictionary',
  wikidata: 'bg-node-wikidata',
  image: 'bg-node-image',
  user: 'bg-node-user',
  arena: 'bg-node-arena',
};

function ConceptNodeComponent({ data, selected }: NodeProps<ConceptNodeData>) {
  const approvedCount = data.conversations.filter((c) => c.approved).length;
  const isMobile = useIsMobile();
  const isRoot = data.depth === 0;

  const labelLen = data.label.length;
  const textClass = isRoot
    ? 'text-xs'
    : labelLen <= 14
      ? 'text-xs'
      : 'text-2xs';

  return (
    <div
      className={`
        animate-node-appear
        ${isRoot ? 'min-w-[100px] max-w-[220px]' : 'min-w-[80px] max-w-[180px]'}
        bg-white border
        ${isRoot && !selected ? 'border-ink-0 border-[1.5px] shadow-sm' : ''}
        ${!isRoot && !selected ? 'border-surface-2' : ''}
        px-2.5 group cursor-pointer
        transition-all duration-150
        hover:-translate-y-0.5 hover:shadow-sm
        ${isMobile ? 'py-2.5 min-h-[44px]' : isRoot ? 'py-2.5' : 'py-2'}
        ${selected ? 'border-ink-3 shadow-md' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />

      <div className="flex items-start gap-1.5">
        <div className={`${isRoot ? 'w-2 h-2' : 'w-1.5 h-1.5'} flex-shrink-0 mt-1 rounded-full ${sourceColors[data.source]}`} />
        <span className={`${textClass} ${isRoot ? 'font-semibold' : 'font-medium'} text-ink-0 leading-tight break-words flex-1`}>
          {data.label}
        </span>
        {data.imageUrl && (
          <img
            src={data.imageUrl}
            alt=""
            className="w-8 h-8 object-cover flex-shrink-0 bg-surface-1"
            loading="lazy"
          />
        )}
        {approvedCount > 0 && (
          <div className="w-1.5 h-1.5 bg-node-user flex-shrink-0 mt-1 rounded-full" />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />
    </div>
  );
}

export default memo(ConceptNodeComponent);
